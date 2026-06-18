// databaseHealthService — service-layer façade over the DatabaseHealthEngine, so
// logic/UI never import the data-provider layer or a provider directly.
import { databaseHealthEngine } from '@/data-provider/health/DatabaseHealthEngine.js';

export const databaseHealthService = {
  scan() { return databaseHealthEngine.scan(); },
  repair() { return databaseHealthEngine.repair(); },
  validate() { return databaseHealthEngine.validate(); },
};

export default databaseHealthService;
