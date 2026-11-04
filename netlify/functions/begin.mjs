import { handleBegin } from '../lib/core.mjs';
import { jsonEndpoint } from '../lib/http.mjs';

export default jsonEndpoint(handleBegin);
export const config = { path: '/api/begin' };
