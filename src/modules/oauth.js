import { storage, showToast } from './utils.js';

// Default Client IDs (can be overridden in Settings)
// These are public Client IDs for Single Page Apps (no client secrets needed)
const DEFAULT_SPOTIFY_CLIENT_ID = '72a6b28c89b4412ab3d274bf3000570b'; // Example public client ID sandbox
const DEFAULT_MICROSOFT_CLIENT_ID = '3bde1ff4-4770-496a-81a1-300000000000'; // Example sandbox client ID

export const oauth = {
  getSpotifyClientId: () => storage.get('spotify_client_id', DEFAULT_SPOTIFY_CLIENT_ID),
  setSpotifyClientId: (id) => storage.set('spotify_client_id', id),
  
  getMicrosoftClientId: () => storage.get('microsoft_client_id', DEFAULT_MICROSOFT_CLIENT_ID),
  setMicrosoftClientId: (id) => storage.set('microsoft_client_id', id),

  getSpotifyToken: () => {
    const token = storage.get('spotify_token', null);
    const expiry = storage.get('spotify_token_expiry', 0);
    if (token && Date.now() < expiry) return token;
    return null;
  },

  getMicrosoftToken: () => {
    const token = storage.get('microsoft_token', null);
    const expiry = storage.get('microsoft_token_expiry', 0);
    if (token && Date.now() < expiry) return token;
    return null;
  },

  loginSpotify: () => {
    const clientId = oauth.getSpotifyClientId();
    const redirectUri = window.location.origin + '/';
    const state = 'spotify_auth_state';
    const scopes = 'user-read-playback-state user-modify-playback-state playlist-read-private';
    
    const url = `https://accounts.spotify.com/authorize?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&response_type=token&state=${encodeURIComponent(state)}`;
    
    storage.set('oauth_pending', 'spotify');
    window.location.href = url;
  },

  loginMicrosoft: () => {
    const clientId = oauth.getMicrosoftClientId();
    const redirectUri = window.location.origin + '/';
    const state = 'microsoft_auth_state';
    const scopes = 'Tasks.ReadWrite offline_access';
    
    const url = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&response_type=token&state=${encodeURIComponent(state)}`;
    
    storage.set('oauth_pending', 'microsoft');
    window.location.href = url;
  },

  logoutSpotify: () => {
    storage.set('spotify_token', null);
    storage.set('spotify_token_expiry', 0);
    showToast('Logged out from Spotify');
  },

  logoutMicrosoft: () => {
    storage.set('microsoft_token', null);
    storage.set('microsoft_token_expiry', 0);
    showToast('Logged out from Microsoft To-Do');
  },

  // Parse token from redirect hash
  checkRedirectCallback: () => {
    const hash = window.location.hash;
    if (!hash) return;
    
    const params = new URLSearchParams(hash.substring(1));
    const accessToken = params.get('access_token');
    const expiresIn = params.get('expires_in') || 3600;
    const state = params.get('state');
    
    if (accessToken) {
      const expiryTime = Date.now() + parseInt(expiresIn) * 1000;
      const pending = storage.get('oauth_pending', '');
      
      if (pending === 'spotify' || state === 'spotify_auth_state') {
        storage.set('spotify_token', accessToken);
        storage.set('spotify_token_expiry', expiryTime);
        storage.set('spotify_linked', true);
        storage.set('oauth_pending', '');
        showToast('Spotify account linked successfully!', 'success');
      } else if (pending === 'microsoft' || state === 'microsoft_auth_state') {
        storage.set('microsoft_token', accessToken);
        storage.set('microsoft_token_expiry', expiryTime);
        storage.set('microsoft_linked', true);
        storage.set('oauth_pending', '');
        showToast('Microsoft To-Do linked successfully!', 'success');
      }
      
      // Clean up hash from address bar
      window.history.replaceState(null, null, window.location.pathname + window.location.search);
    }
  }
};
