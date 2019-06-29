import * as API from './API';
import * as Test from './Test';
import { Simple } from './Test/Logger';
import * as minimist from 'minimist';
import { SpecOverrider } from './Test/SpecOverrider';
import { Runner } from './Test/Runner';

let argv = minimist(process.argv.slice(2));

API.addLoader({swagger: "2.0"}, API.SpecV2.loader);
API.addLoader({openapi: "3.0.1"}, API.SpecV3.loader);

const 
	filename = argv.spec,
	hostname = argv.host,
	resource = argv.resource,
	requestContentType = argv.reqCT || '*',
	responseStatus = argv.respStatus || 0,
	responseContentType = argv.restCT || '*',

	override = argv.override
;

if (! filename) {
	console.log(`Please specify a path to a Swagger / Open API specification YAML file.`);
	process.exit(-1);
}

let spec: API.Spec;

try {
	spec = API.load(filename);
	let logger = new Simple();
	let runner = new Runner(spec, logger, new SpecOverrider(override, logger));

	runner.test(hostname, resource, requestContentType, responseStatus, responseContentType)
		.then((result) => {
			process.exit(result ? 0 : -1);
		})
		.catch((err) => theCatch);
} catch (err) {
	theCatch(err);
}

function theCatch(err: any) {
	console.log(`Better luck next time.`);
	console.log(err);
	process.exit(-1);
}