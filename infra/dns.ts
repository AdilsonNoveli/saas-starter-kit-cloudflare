import { flags, prodDomain, devDomain } from "#nuxfire/config";

export const domain =
  { production: prodDomain }[$app.stage] || `${$app.stage}.${devDomain}`;

export const appDomain = `app.${domain}`;
export const authDomain = `auth.${domain}`;
export const websocketsDomain = `websockets.${domain}`;
export const webDomain = `${domain}`;

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
