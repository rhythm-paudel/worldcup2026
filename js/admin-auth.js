import { CONFIG } from './config.js';
import { verifyPin } from './auth.js';

/** Gate admin without a sign-in form — bookmark the private URL with ?k= */
export async function checkAdminAccess() {
  const params = new URLSearchParams(location.search);
  const key = params.get('k');

  if (key && (await verifyPin(key, CONFIG.adminAccessHash))) {
    localStorage.setItem(CONFIG.adminAccessKey, CONFIG.adminAccessHash);
    history.replaceState(null, '', location.pathname);
    return true;
  }

  return localStorage.getItem(CONFIG.adminAccessKey) === CONFIG.adminAccessHash;
}
