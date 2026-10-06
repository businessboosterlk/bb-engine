#!/usr/bin/env node
/* Serves the built app on a fixed port for a person to look at: node scripts/serve.mjs 4682 */
import { serve, FOLDER } from './lib/world.mjs';
const port = Number(process.argv[2] || 4682);
const { base } = serve(undefined, port);
console.log('The Engine build is at ' + base + FOLDER + '/');
