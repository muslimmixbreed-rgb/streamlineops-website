import { handleStart } from '../lib/core.mjs';
import { jsonEndpoint } from '../lib/http.mjs';

export default jsonEndpoint(handleStart);
export const config = { path: '/api/start' };
