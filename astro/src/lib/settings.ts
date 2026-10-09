import data from '../../../_data/site-settings.json';
import { validateSettings } from '../../../writer/src/site-settings';

export const siteSettings = validateSettings(data);
