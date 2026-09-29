import packageJson from '../package.json';

/**
 * Get the current application version from package.json
 */
export function getVersion(): string {
  return packageJson.version;
}

/**
 * Get the version with a 'v' prefix (e.g., "v1.2.3")
 */
export function getVersionWithPrefix(): string {
  return `v${packageJson.version}`;
}

/**
 * Check if current version is a pre-release (contains -, e.g., "1.0.0-beta.1")
 */
export function isPreRelease(): boolean {
  return packageJson.version.includes('-');
}

/**
 * Get the major.minor.patch parts separately
 */
export function getVersionParts(): {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
} {
  const [version, prerelease] = packageJson.version.split('-');
  const [major, minor, patch] = version.split('.').map(Number);

  return {
    major,
    minor,
    patch,
    ...(prerelease && { prerelease }),
  };
}
