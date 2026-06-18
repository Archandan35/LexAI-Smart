import { envService } from '@/services/envService.js';

// envLogic — business-rule wrapper so the Environment & API Manager page stays
// out of the service layer (Pages → Logic → Services → Providers).
export const envLogic = {
  list: () => envService.list(),
  upsert: (data, user) => envService.upsert(data, user),
  remove: (name, user) => envService.remove(name, user),
  setStatus: (name, status, user) => envService.setStatus(name, status, user),
  rotate: (name, user) => envService.rotate(name, user),
  history: () => envService.history(),
  apis: () => envService.apis(),
  test: (name) => envService.test(name),
};

export default envLogic;
