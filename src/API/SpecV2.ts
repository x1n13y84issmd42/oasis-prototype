import { Spec } from ".";
import { Data } from "../Test/Data";

const resourceOps = ['get', 'post', 'put', 'delete'];

export class SpecV2 extends Spec {
	getSchema(name: string): Spec.Schema {
		let sch = this.spec.definitions[name];

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

	getSecurity(name: string): Spec.Security {
		if (!name) {
			return undefined;
		}

		let sec = this.spec.securityDefinitions[name];

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

	getHost(name: string): Spec.Host {
		return {
			name: "Default",
			url: (this.spec.schemes[0] || 'http') + '://' + this.spec.host + this.spec.basePath,
			description: "The Swagger Spec 2.0 supports only one host per spec.",
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

	extractParametersToHeaders(parameters: any): Spec.HeaderBag {
		return {} as Spec.HeaderBag;
	}

	getRequests(op: any): Spec.Request[] {
		return [];
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
		
		if (resp.schema) {
			let schema: Spec.Schema;
			let ref = this.resolveSchemaRef(resp.schema)
		
			if (ref) {
				schema = this.getSchema(ref);
			}

			responses.push({
				type: this.mapContainerType(resp.schema),
				schema: schema,
				statusCode: status,
				headers: headers,
				contentType: this.spec.consumes[0] || '*/*',	//TODO: generalize this
			});
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
	
	extractHeaders(headers: any): Spec.HeaderBag {
		return {} as Spec.HeaderBag;
	}

	resolveSchemaRef(schema: any) {
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

	protected assemblePath(pathName: string, path: any) {
		let res: string = pathName;

		if (path.parameters) {
			for (let pp of path.parameters) {
				let rx = new RegExp(`\{${pp.name}\}`, "gi");
				res = res.replace(rx, pp['x-example']);
			}
		}

		return res;
	}
}

/**
 * A loader function to create a typed & versioned API spec object from raw YAML data.
 * Supply it to the API.addLoader function.
 */
export namespace SpecV2 {
	export function loader(doc: any) {
		return new SpecV2(doc);
	}
}
