import { github, repositoryTree } from "./github";
import { HttpError, isPostPath, parsePost } from "./model";
import { assertCategoryRemoval, postCategoryKeys, SETTINGS_PATH, validateSettings, type SiteSettings } from "./site-settings";
import { format } from "prettier/standalone";
import babel from "prettier/plugins/babel";
import estree from "prettier/plugins/estree";

type Repository = Awaited<ReturnType<typeof repositoryTree>>;
async function readSettings(token: string, repo: Repository) {
  const file = repo.files.find((item) => item.path === SETTINGS_PATH && item.type === "blob");
  if (!file) throw new HttpError(503, "사이트 설정을 준비 중입니다. 잠시 후 다시 열어 주세요.");
  const blob = await github<{ content: string; size: number }>(token, `${repo.root}/git/blobs/${file.sha}`);
  if (blob.size > 650_000) throw new HttpError(413, "설정 파일이 너무 큽니다.");
  const content = new TextDecoder().decode(Uint8Array.from(atob(blob.content.replace(/\s/g, "")), (c) => c.charCodeAt(0)));
  return { settings: validateSettings(JSON.parse(content)), sha: file.sha };
}
async function categoryUsage(env: Env, token: string, repo: Repository): Promise<Record<string, number>> {
  const files = repo.files.filter((file) => file.type === "blob" && isPostPath(file.path));
  if (files.length > 2000) throw new HttpError(413, "글 목록이 너무 큽니다.");
  const [owner, name] = env.GITHUB_REPOSITORY.split("/");
  const usage: Record<string, number> = Object.create(null);
  function add(keys: string[], count = 1) {
    for (const key of keys) usage[key] = (usage[key] ?? 0) + count;
  }
  // One GraphQL request per batch, instead of a REST request for every post.
  for (let offset = 0; offset < files.length; offset += 30) {
    const batch = files.slice(offset, offset + 30);
    const expressions = batch.map((file, index) => `$p${index}:String!`).join(",");
    const fields = batch.map((_, index) => `p${index}:object(expression:$p${index}){... on Blob{text}}`).join(" ");
    const variables: Record<string, string> = { owner, name };
    batch.forEach((file, index) => (variables[`p${index}`] = `${repo.head}:${file.path}`));
    const result = await github<{ data?: { repository: Record<string, { text: string } | null> }; errors?: unknown[] }>(token, "/graphql", {
      method: "POST",
      body: JSON.stringify({
        query: `query($owner:String!,$name:String!,${expressions}){repository(owner:$owner,name:$name){${fields}}}`,
        variables,
      }),
    });
    if (result.errors?.length || !result.data?.repository) throw new HttpError(502, "카테고리 사용 현황을 불러오지 못했습니다.");
    batch.forEach((file, index) => {
      const content = result.data!.repository[`p${index}`]?.text;
      if (typeof content !== "string") throw new HttpError(502, "글 정보를 불러오지 못했습니다.");
      add(postCategoryKeys(parsePost(content, file.path, file.sha)));
    });
  }
  const drafts = await env.DB.prepare(
    "SELECT json_extract(document, '$.category') AS category, count(*) AS total FROM drafts WHERE COALESCE(json_extract(document, '$.collection'), 'blog') = 'blog' GROUP BY category LIMIT 2001"
  ).all<{ category: string; total: number }>();
  if (drafts.results.length > 2000) throw new HttpError(413, "초안 카테고리 목록이 너무 큽니다.");
  for (const row of drafts.results)
    if (typeof row.category === "string") add(postCategoryKeys({ category: row.category, sourcePath: null, metadata: {} }), row.total);
  return usage;
}
export async function getSiteSettings(env: Env, token: string) {
  const repo = await repositoryTree(env, token);
  const snapshot = await readSettings(token, repo);
  return { ...snapshot, usage: await categoryUsage(env, token, repo) };
}
export async function saveSiteSettings(env: Env, token: string, value: unknown, expected: unknown) {
  if (typeof expected !== "string" || !/^[a-f0-9]{40}$/.test(expected)) throw new HttpError(400, "저장할 설정 버전을 확인해 주세요.");
  const settings = validateSettings(value);
  const repo = await repositoryTree(env, token);
  const previous = await readSettings(token, repo);
  if (previous.sha !== expected) throw new HttpError(409, "다른 곳에서 설정이 변경되었습니다. 내용을 내려받고 다시 불러와 주세요.");
  const usage = await categoryUsage(env, token, repo);
  assertCategoryRemoval(previous.settings, settings, usage);
  const content = await format(JSON.stringify(settings), { parser: "json", plugins: [babel, estree], printWidth: 150, trailingComma: "es5" });
  const blob = await github<{ sha: string }>(token, `${repo.root}/git/blobs`, {
    method: "POST",
    body: JSON.stringify({ content, encoding: "utf-8" }),
  });
  const tree = await github<{ sha: string }>(token, `${repo.root}/git/trees`, {
    method: "POST",
    body: JSON.stringify({ base_tree: repo.treeSha, tree: [{ path: SETTINGS_PATH, mode: "100644", type: "blob", sha: blob.sha }] }),
  });
  const commit = await github<{ sha: string }>(token, `${repo.root}/git/commits`, {
    method: "POST",
    body: JSON.stringify({ message: "Update categories and homepage favorites", tree: tree.sha, parents: [repo.head] }),
  });
  await github(token, `${repo.root}/git/refs/heads/${env.GITHUB_BRANCH}`, {
    method: "PATCH",
    body: JSON.stringify({ sha: commit.sha, force: false }),
  });
  return { settings, sha: blob.sha, usage, workflowUrl: `https://github.com/${env.GITHUB_REPOSITORY}/actions?query=workflow%3A%22Deploy+site%22` };
}
