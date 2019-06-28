import * as API from './API';
import * as Test from './Test';
import { Simple } from './Test/Logger';
import * as minimist from 'minimist';
import { SpecOverrider } from './Test/SpecOverrider';

import * as yaml from 'js-yaml';
import * as fs from 'fs';

let doc = yaml.safeLoad(fs.readFileSync('test.yaml', 'utf8'));


let argv = minimist(process.argv.slice(2));

// console.log('ARGV', argv);

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

if (! hostname) {
	console.log(`Please specify a name of the API host to use for testing.`);
	process.exit(-1);
}

if (! resource) {
	console.log(`Please specify a resource name to test.`);
	process.exit(-1);
}

let spec: API.Spec;


try {
	spec = API.load(filename);
	let logger = new Simple();

	let pi = spec.getProjectInfo();
	logger.testingProject(pi);
	
	let host = spec.getHost(hostname);
	logger.usingHost(host);	
	
	let res = spec.getResource(resource);
	let resT = new Test.Resource(host, res, logger, new SpecOverrider(override, logger));
	let result = resT.test(requestContentType, ~~responseStatus, responseContentType,).catch(theCatch);

	if (! result) {
		process.exit(-1);
	}
} catch (err) {
	theCatch(err);
}

function theCatch(err: any) {
	if (err instanceof API.Spec.ResourceNotFoundError) {
		console.log(err.message);
		if (spec) {
			let resources = spec.getResources();
			console.log("Available operations:");
			
			for (let r of resources) {
				console.log('\t' + r.name);
				console.log('\t' + r.method.toLocaleUpperCase() + ' ' + r.path);
				console.log('');
			}
		}
	} else {
		console.log(`Better luck next time.`);
		console.log(err);
	}
	
	process.exit(-1);
}