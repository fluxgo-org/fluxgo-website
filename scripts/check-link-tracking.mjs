// Checks for lib/link-tracking.js. Run: npm run check:link-tracking
import assert from 'node:assert/strict';
import {
  attributionOf, carryParams, isBot, linkOf, openedIn, pageLinkContext, playStoreWithReferrer, readCampaign,
  readShareId, referrerDomainOf, visitProperties, withParams
} from '../lib/link-tracking.js';

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1';
const INSTAGRAM = `${IPHONE} Instagram 350.0.0.0 (iPhone15,2; iOS 18_1; en_IN)`;
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36';

// Share ID and tags.
assert.equal(readShareId(new URLSearchParams('s=K3F9X2AB')), 'k3f9x2ab');
assert.equal(readShareId(new URLSearchParams('s=bad id')), null);
assert.equal(readShareId(new URLSearchParams('s=abc')), null);
assert.deepEqual(readCampaign(new URLSearchParams('utm_source=Instagram&utm_medium=story&utm_campaign=<x>')), { utm_source: 'instagram', utm_medium: 'story' });

// Link types. Invite codes never leave the site.
assert.deepEqual(linkOf('/ride/TRP-01JABCDEFG'), { link_type: 'ride', link_id: 'TRP01JABCDEFG' });
assert.deepEqual(linkOf('/cab-ride/5B1C0E4E-1111-4222-8333-944455556666'), { link_type: 'cab_ride', link_id: '5b1c0e4e-1111-4222-8333-944455556666' });
assert.deepEqual(linkOf('/r/ABC123'), { link_type: 'invite' });
assert.deepEqual(linkOf('/partner/trip/tok'), { link_type: 'partner_trip' });
assert.deepEqual(linkOf('/'), { link_type: 'site', page: 'home' });
assert.deepEqual(linkOf('/support'), { link_type: 'site', page: 'support' });

// Source and medium.
assert.deepEqual(attributionOf({ shareId: 'k3f9x2ab', linkType: 'ride' }), { utm_source: 'share', utm_medium: 'ride' });
assert.deepEqual(attributionOf({ shareId: 'k3f9x2ab', campaign: { utm_source: 'instagram' }, linkType: 'ride' }), { utm_source: 'instagram', utm_medium: 'ride' });
assert.deepEqual(attributionOf({ linkType: 'site', referrerDomain: 'google.com' }), { utm_source: 'referral', utm_medium: 'referral' });
assert.deepEqual(attributionOf({ linkType: 'site' }), { utm_source: 'direct', utm_medium: 'none' });
assert.equal(referrerDomainOf('https://www.google.com/search?q=fluxgo'), 'google.com');
assert.equal(referrerDomainOf('https://app.fluxgo.in/trip/1'), null);

// Preview bots are not clicks. People are.
for (const bot of ['WhatsApp/2.24.1 A', 'TelegramBot (like TwitterBot)', 'facebookexternalhit/1.1', 'Slackbot-LinkExpanding 1.0', 'LinkedInBot/1.0', 'Googlebot/2.1', 'curl/8.4.0', '']) {
  assert.equal(isBot(bot), true, bot);
}
for (const person of [IPHONE, INSTAGRAM, ANDROID]) assert.equal(isBot(person), false, person);
assert.equal(openedIn(INSTAGRAM), 'instagram');
assert.equal(openedIn(IPHONE), 'browser');

// Full visit.
const visit = visitProperties({ pathname: '/ride/TRP01JABCDEFG', params: new URLSearchParams('s=k3f9x2ab'), userAgent: INSTAGRAM, referer: null });
assert.equal(visit.share_id, 'k3f9x2ab');
assert.equal(visit.utm_source, 'share');
assert.equal(visit.utm_medium, 'ride');
assert.equal(visit.device_kind, 'ios');
assert.equal(visit.opened_in, 'instagram');

// Carried values.
assert.equal(withParams('https://app.fluxgo.in/trip/X', carryParams({ shareId: 'k3f9x2ab', campaign: { utm_source: 'share' } })), 'https://app.fluxgo.in/trip/X?s=k3f9x2ab&utm_source=share');
assert.equal(withParams('https://app.fluxgo.in', new URLSearchParams()), 'https://app.fluxgo.in');
const play = playStoreWithReferrer('https://play.google.com/store/apps/details?id=in.fluxgo.app', { shareId: 'k3f9x2ab', linkType: 'ride' });
assert.equal(new URL(play).searchParams.get('referrer'), 'utm_source=share&utm_medium=ride&utm_campaign=ride&utm_content=k3f9x2ab');
const link = pageLinkContext({ pathname: '/ride/TRP01JABCDEFG', searchParams: { s: 'k3f9x2ab' }, visitorId: '0123456789abcdef' });
assert.equal(link.next('https://go.fluxgo.in/open/ride/TRP01JABCDEFG', { visitor: true }), 'https://go.fluxgo.in/open/ride/TRP01JABCDEFG?s=k3f9x2ab&utm_source=share&utm_medium=ride&v=0123456789abcdef');
assert.equal(link.next('trip/TRP01JABCDEFG'), 'trip/TRP01JABCDEFG?s=k3f9x2ab&utm_source=share&utm_medium=ride');

console.log('link tracking checks passed');
