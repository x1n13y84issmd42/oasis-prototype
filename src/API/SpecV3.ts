import { Spec } from ".";
import { Data } from "../Test/Data";

const resourceOps = ['get', 'post', 'put', 'delete'];

export class SpecV3 extends Spec {
	getSchema(name: string): Spec.Schema {
		let sch = this.spec.components.schemas[name];

		if (! sch) {
			throw new Error(`Model schema "${name}" was not found.`);
		}

		function propmap(name: string, prop: any): Spec.Property {
			let propType = Data.map(prop.type)

			if (! propType) {
				throw new Error(`Could not determine the property type corresponding to '${prop.type}'.`);
			}

			let requiredProps = sch.required as Array<string> || [];

			return {
				name: name,
				type: propType,
				description: prop.description,
				required: (requiredProps.indexOf(name) != -1)
			};
		}

		let schema: Spec.Schema = {
			name: name,
			description: sch.description,
			example: sch.example,
			properties: Object.keys(sch.properties).map((pName) => propmap(pName, sch.properties[pName])),
		};

		return schema;
	}

	mapContainerType(schema: any): Spec.DataType {
		if (schema) {
			if (schema.type) {
				return {
					'array': Spec.DataType.Array,
					'object': Spec.DataType.Object,
				}[schema.type];
			}
			if (schema.$ref) {
				return Spec.DataType.Object;
			}
		}
		
		return Spec.DataType.String;
	}

	resolveSchemaRef(schema: any): string {
		const respType = this.mapContainerType(schema);

		let modelSchemaRef: string;

		switch (respType) {
			case Spec.DataType.Array:
				modelSchemaRef = schema.items.$ref;
			break;

			case Spec.DataType.Object:
				modelSchemaRef = schema.$ref;
			break;
		}

		if (! modelSchemaRef) {
			return
		}

		let modelSchemaName = modelSchemaRef.match(/[\w\d]+$/gi)[0];

		if (! modelSchemaName) {
			throw new Error(`Could not resolve the model name from the reference '${modelSchemaRef}'`);
		}

		return modelSchemaName;
	}

	extractHeaders(hdrs: any): Spec.HeaderBag {

		if (! hdrs) {
			return undefined;
		}

		let hb: Spec.HeaderBag = {};

		let hdrNames = Object.keys(hdrs);
		for (let hn of hdrNames) {
			hb[hn] = {
				name: hn,
				type: Data.map(hdrs[hn].schema.type),
				description: hdrs[hn].description,
				example: hdrs[hn].example,
				required: !!hdrs[hn].required,
			}
		}

		return hb;
	}

	extractParametersToHeaders(parameters: any[]) {
		if (! parameters) {
			return;
		}

		let hb: Spec.HeaderBag = {};

		for (let p of parameters) {
			if (p.in === 'header') {
				hb[p.name] = {
					name: p.name,
					type: Data.map(p.type),
					description: p.description,
					example: p.example,
					required: !!p.required,
				}
			}
		}

		return hb;
	}

	getSecurity(name: string): Spec.Security {
		if (!name) {
			return undefined;
		}

		let sec = this.spec.components.securitySchemes[name];

		if (! sec) {
			throw new Error(`Security schema "${name}" was not found.`);
		}
		
		if (sec.example === undefined) {
			throw new Error(`Security schema "${name}" has no example data to use during request.`);
		}

		let pLoc = {
			'query': Spec.ParameterLocation.Query,
			'header': Spec.ParameterLocation.Header,
			'cookie': Spec.ParameterLocation.Cookie,
		}[sec.in];

		if (! pLoc) {
			throw new Error(`'${sec.in}' is an unknown parameter location.`);
		}

		return {
			name: name,
			paramName: sec.name,
			in: pLoc,
			type: sec.type,
			example: sec.example,
		};
	}

	getProjectInfo(): Spec.ProjectInfo {
		return {
			title: this.spec.info.title,
			description: this.spec.info.description,
			version: this.spec.info.version,
		};
	}

	getResource(name: string): Spec.Resource {
		for (let pathName in this.spec.paths) {
			let path = this.spec.paths[pathName];
			for (let opName of resourceOps) {
				let op = path[opName];
				if (op && op.summary === name) {
					//TODO: what are those 0s?
					let opSecName = op.security ? Object.keys(op.security[0])[0] : undefined;
					return {
						name: name,
						path: this.assemblePath(pathName, op),
						method: opName.toLocaleUpperCase(),
						headers: this.extractParametersToHeaders(op.parameters),
						security: this.getSecurity(opSecName),
						requests: this.getRequests(op),
						responses: this.getResponses(op),
					};
				}
			}
		}
		
		throw new Spec.ResourceNotFoundError(name);
	}

	getRequests(op: any): Spec.Request[] {
		if (op.requestBody) {
			let res: Spec.Request[] = [];
			let resp = op.requestBody;

			let contentTypes = Object.keys(resp.content);
			for (let respCT of contentTypes) {
				let content = resp.content[respCT];
				res.push(this.makeRequest(content.schema, respCT));
			}

			return res;
		}
	}

	protected makeRequest(schema: any, ct: string): Spec.Request {
		switch (ct) {
			case 'application/json':
				return this.makeJSONRequest(schema, ct);

			default:
				throw new Error(`The Content-Type of "${ct}" is not supported for requests.`);
		}
	}

	protected makeJSONRequest(schema: any, ct: string): Spec.Request {
		return {
			type: this.mapContainerType(schema),
			contentType: ct,
			schema: this.getSchema(this.resolveSchemaRef(schema)),
		};
	}
	
	getResponses(op: any): Spec.Response[] {
		if (op.responses) {
			let res: Spec.Response[] = [];
			let statusCodes = Object.keys(op.responses);

			for (let respStatus of statusCodes) {
				let resp = op.responses[respStatus];
				res = res.concat(this.makeResponses(resp, ~~respStatus));
			}

			return res;
		}
	}

	protected makeResponses(resp: any, status: number): Spec.Response[] {
		let headers = this.extractHeaders(resp.headers);
		let responses: Spec.Response[] = [];
		
		if (resp.content) {
			let contentTypes = Object.keys(resp.content);
			for (let ct of contentTypes) {
				let content = resp.content[ct];
				let schema: Spec.Schema;

				let ref = this.resolveSchemaRef(content.schema)
				if (ref) {
					schema = this.getSchema(ref);
				}

				responses.push({
					type: this.mapContainerType(content.schema),
					schema: schema,
					statusCode: status,
					headers: headers,
					contentType: ct,
				});
			}
		} else {
			responses.push({
				type: Spec.DataType.String,
				contentType: undefined,
				statusCode: status,
				schema: undefined,
			});
		}

		return responses;
	}

	getResources(): Spec.Resource[] {
		let res: Spec.Resource[] = [];
		
		for (let pathName in this.spec.paths) {
			let path = this.spec.paths[pathName];
			for (let opName of resourceOps) {
				let op = path[opName];
				if (op) {
					let opSecName = op.security ? Object.keys(op.security[0])[0] : undefined;
					res.push({
						name: op.summary,
						path: this.assemblePath(pathName, op),
						method: opName.toLocaleUpperCase(),
						headers: this.extractParametersToHeaders(op.parameters),
						security: this.getSecurity(opSecName),
						requests: this.getRequests(op),
						responses: this.getResponses(op),
					});
				}
			}
		}

		return res;
	}

	protected assemblePath(path: string, op: any) {
		let res: string = path;

		if (op.parameters) {
			for (let pp of op.parameters) {
				if (pp.in === 'path') {
					let rx = new RegExp(`\{${pp.name}\}`, "gi");
					res = res.replace(rx, pp['example']);
				}
			}
		}

		return res;
	}

	getHost(name: string|number): Spec.Host {
		if (typeof name == 'string') {
			for (let s of this.spec.servers) {
				if (s.description === name) {
					return {name: name, url: s.url, description: s.decription};
				}
			}
		} else {
			if (name < this.spec.servers.length) {
				let s = this.spec.servers[name];
				return {name: s.description || `#${name}`, url: s.url, description: s.description};
			}
		}

		throw new Error(`API host "${name}" was not found.`);
	}
}

/**
 * A loader function to create a typed & versioned API spec object from raw YAML data.
 * Supply it to the API.addLoader function.
 */
export namespace SpecV3 {
	export function loader(doc: any) {
		return new SpecV3(doc);
	}
}
