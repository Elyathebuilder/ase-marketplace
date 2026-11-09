/** Preview build: there is no server, so server actions are never called (the journey uses LocalJourney). */
const noServer = async () => {
  throw new Error("No server in the static preview");
};
export const placeOrderAction = noServer;
export const marketAction = noServer;
export const signInAs = noServer;
export const signOut = noServer;
