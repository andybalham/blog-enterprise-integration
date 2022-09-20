/* eslint-disable import/prefer-default-export */
/* eslint-disable no-console */
export const handler = async (event: Record<string, any>): Promise<any> => {
  console.log(JSON.stringify({ event }, null, 2));
};