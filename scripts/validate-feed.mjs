#!/usr/bin/env node
// Valida un feed contra el esquema oficial de OTE (@opentechevents/schema). Sale con error si no es válido.
import { readFileSync } from "node:fs";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { ajvOptions, annotationKeywords, customFormats, customKeywords, schemas } from "@opentechevents/schema";

const file = process.argv[2] ?? "dist/feed.json";
const feed = JSON.parse(readFileSync(file, "utf8"));

const ajv = new Ajv2020({ ...ajvOptions, allErrors: true });
addFormats(ajv);
for (const kw of annotationKeywords) ajv.addKeyword(kw);
for (const f of customFormats) ajv.addFormat(f.name, f.validate);
for (const kw of customKeywords) ajv.addKeyword(kw);
const [eventSchema, feedSchema] = schemas; // el feed referencia al evento por $id: va primero
ajv.addSchema(eventSchema);
const validate = ajv.compile(feedSchema);

if (!validate(feed)) {
  console.error(`❌ ${file} no es un feed OTE válido:`);
  for (const e of validate.errors) console.error(`  ${e.instancePath || "/"} ${e.message}`);
  process.exit(1);
}
console.log(`✅ ${file} es un feed OTE ${feed.specVersion} válido (${feed.events.length} eventos).`);
