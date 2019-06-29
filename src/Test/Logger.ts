import * as API from '../API';

export interface ILogger {
	error(err: Error);
	testingProject(p: API.Spec.ProjectInfo);
	usingHost(p: API.Spec.Host);
	usingDefaultHost();
	testingResource(res: API.Spec.Resource);
	usingSecurity(sec: API.Spec.Security);
	usingRequest(req: API.Spec.Request);
	usingResponse(req: API.Spec.Response);

	overriding(what: string);
	
	propertyHasNoValue(prop: API.Spec.Property);
	propertyHasWrongType(prop: API.Spec.Property);
	headerHasNoValue(schema: API.Spec.Header);
	headerHasWrongType(schema: API.Spec.Header);
	responseHasWrongStatus(schema: API.Spec.Response, actualStatus: number);
	responseHasWrongContentType(schema: API.Spec.Response, actualCT: string);
	responseExpectedArray(schema: API.Spec.Response, actual);
	responseExpectedObject(schema: API.Spec.Response, actual);

	resourceOK(res: API.Spec.Resource);
	resourceFail(res: API.Spec.Resource);
	schemaOK(schema: API.Spec.Schema);
	schemaFail(schema: API.Spec.Schema);
}

export class Simple implements ILogger {
	usingDefaultHost() {
		console.log(`No host name has been specified, using the first one in the list.`);
	}
	responseExpectedArray(schema: API.Spec.Response, actual) {
		let actualName = actual.name || actual.constructor.name;
		console.log(`\tExpected an array in response, but received something else (${actualName}).`);
	}
	responseExpectedObject(schema: API.Spec.Response, actual) {
		let actualName = actual.name || actual.constructor.name;
		console.log(`\tExpected an object in response, but received something else (${actualName}).`);
	}
	error(err: Error) {
		console.log(`\tBetter luck next time.`);
		console.log(`\t${err.message}`);
	}

	overriding(what: string) {
		console.log(`\tOverriding ${what}.`);
	}

	responseHasWrongStatus(resp: API.Spec.Response, actualStatus: number) {
		console.log(`\tExpected the ${resp.statusCode} status in response, but got ${actualStatus}.`);
	}
	
	responseHasWrongContentType(resp: API.Spec.Response, actualCT: string) {
		console.log(`\tExpected the '${resp.contentType}' Content-Type in response, but got '${actualCT}'.`);
	}

	usingRequest(req: API.Spec.Request) {
		console.log(`\tUsing the '${req.contentType}' request.`);
	}
	
	usingResponse(resp: API.Spec.Response) {
		if (resp.schema) {
			console.log(`\tTesting against the '${resp.schema.name}' response.`);
		} else {
			console.log(`\tTesting against the ${resp.contentType || "*/*"} @ ${resp.statusCode} response.`);
		}
	}

	headerHasNoValue(hdr: API.Spec.Header) {
		console.log(`\tHeader '${hdr.name}' is required but is not present.`);
	}

	headerHasWrongType(hdr: API.Spec.Header) {
		console.log(`\tHeader '${hdr.name}' has a wrong type.`);
	}

	resourceOK(res: API.Spec.Resource) {
		console.log("OK");
	}
	
	resourceFail(res: API.Spec.Resource) {
		console.log(`FAILURE`);
	}

	schemaOK(schema: API.Spec.Schema) {
	}

	schemaFail(schema: API.Spec.Schema) {
		console.log(`\tSchema '${schema.name}' has errors.`);
	}

	usingSecurity(sec: API.Spec.Security) {
			console.log(`\tUsing the '${sec.name}' security settings.`);
	}

	propertyHasNoValue(prop: API.Spec.Property) {
		console.log(`\tProperty '${prop.name}' is required but is not present.`);
	}
	
	propertyHasWrongType(prop: API.Spec.Property) {
		console.log(`\tProperty '${prop.name}' has a wrong type.`);
	}

	testingProject(pi: API.Spec.ProjectInfo) {
		console.log(`Testing the ${pi.title} @ ${pi.version}`);
	}

	usingHost(host: API.Spec.Host) {
		console.log(`Using the "${host.name}" host @ ${host.url}`);
	}

	testingResource(res: API.Spec.Resource) {
		console.log(`Testing the "${res.name}" resource @ ${res.method.toLocaleUpperCase()} ${res.path}`);
	}
}
