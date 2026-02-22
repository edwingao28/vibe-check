#!/usr/bin/env node
/**
 * slop-scan CLI entry point.
 *
 * Usage: slop-scan [path] [--verbose] [--json] [--deep] [--full] [--no-cache] [--help]
 *
 * Pipeline: resolve scope -> run extractors -> build IR -> run signals ->
 *           compute intent -> attenuate -> aggregate -> report -> output JSON
 */
export {};
