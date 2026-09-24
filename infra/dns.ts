import { flags } from "#nuxfire/config";
import { branding } from "./branding";

// `production` answers on the brand domain itself; every other stage on
// `<stage>.dev.<domain>` (e.g. stage 'alex' → alex.dev.acme.io).
export const domain =
  $app.stage === "production"
    ? branding.domain
    : `${$app.stage}.dev.${branding.domain}`;

export const appDomain = `app.${domain}`;
export const authDomain = `auth.${domain}`;
export const websocketsDomain = `websockets.${domain}`;
export const webDomain = `${domain}`;
// Only the production apex also answers on `www.` (301 to the apex, see
// deployWorker's `redirects`). Dev stages live under `<stage>.dev.<domain>`,
// where a `www.` sibling has no purpose.
export const webRedirects =
  $app.stage === "production" ? [`www.${domain}`] : [];

export const authUrl = new sst.Linkable("AuthUrl", {
  properties: {
    value: $interpolate`https://${authDomain}`,
  },
});
export const webUrl = new sst.Linkable("WebUrl", {
  properties: {
    value: $interpolate`https://${webDomain}`,
  },
});
export const websocketsUrl = flags.websockets
  ? new sst.Linkable("WebsocketsUrl", {
      properties: {
        value: $interpolate`wss://${websocketsDomain}`,
      },
    })
  : undefined;
export const appUrl = new sst.Linkable("AppUrl", {
  properties: {
    value: $interpolate`https://${appDomain}`,
  },
});
