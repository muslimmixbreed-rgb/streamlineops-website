import { handleClaude } from '../lib/core.mjs';
import { jsonEndpoint } from '../lib/http.mjs';

export default jsonEndpoint(handleClaude);
export const config = { path: '/api/claude' };
