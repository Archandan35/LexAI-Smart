import { RailwayProvider } from './RailwayProvider.js';
import { RenderProvider } from './RenderProvider.js';
import { DockerProvider } from './DockerProvider.js';
import { VercelProvider } from './VercelProvider.js';
import { SelfHostedProvider } from './SelfHostedProvider.js';
import { KubernetesProvider } from './KubernetesProvider.js';

const ALL_PROVIDERS = [
  RailwayProvider,
  RenderProvider,
  DockerProvider,
  VercelProvider,
  SelfHostedProvider,
  KubernetesProvider,
];

export function detectBackendProvider() {
  for (const p of ALL_PROVIDERS) {
    if (p.detect()) return p;
  }
  return null;
}

export function getBackendProvider(name) {
  return ALL_PROVIDERS.find((p) => p.name === name) || null;
}

export function listBackendProviders() {
  return ALL_PROVIDERS.map((p) => ({ name: p.name, label: p.label, description: p.description }));
}

export { ALL_PROVIDERS };
