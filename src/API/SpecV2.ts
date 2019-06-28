import { Spec } from ".";

const resourceOps = ['get', 'post', 'put', 'delete'];

export class SpecV2 extends Spec {
	getSchema(name: string): Spec.Schema {
		throw new Error("Method not implemented.");
	}

	getSecurity(name: string): Spec.Security {
		throw new Error("Method not implemented.");
	}

	getHost(name: string): Spec.Host {
		return this.spec.host;
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
					return {
						name: name,
						path: this.assemblePath(pathName, path),
						method: opName,
						headers: {},
					};
				}
			}
		}
		
		throw new Spec.ResourceNotFoundError(name);
	}
	
	getResources(): Spec.Resource[] {
		let res: Spec.Resource[] = [];
		
		for (let pathName in this.spec.paths) {
			let path = this.spec.paths[pathName];
			for (let opName of resourceOps) {
				let op = path[opName];
				if (op) {
					res.push({
						name: op.summary,
						path: this.assemblePath(pathName, path),
						method: opName,
						headers: {},
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
