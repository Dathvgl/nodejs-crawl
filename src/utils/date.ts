import moment from "moment";

export const nowISO = () => new Date(Date.now()).toISOString();
export const momentNowTS = () =>
  parseInt(moment(new Date(Date.now())).format("X"));
