/* eslint-disable import/prefer-default-export */
/* eslint-disable no-console */
export const handler = async (event: Record<string, any>): Promise<any> => {
  console.log(JSON.stringify({ event }, null, 2));

  // TODO 28Sep22: Create mock function to return a scripted response
};
