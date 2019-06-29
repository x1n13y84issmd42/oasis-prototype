export abstract class Spec {
	constructor(protected spec: any) {}

	abstract getProjectInfo(): Spec.ProjectInfo;
	abstract getResource(name: string): Spec.Resource;
	abstract getResources(): Spec.Resource[];
	abstract getHost(name: string|number): Spec.Host;
	abstract getSecurity(name: string): Spec.Security;
	abstract getSchema(name: string): Spec.Schema;
}

export namespace Spec {
	/**
	 * An actual resource represented by a URL.
	 */
	export type Resource = {
		name: string;
		path: string;
		method: string;
		headers?: HeaderBag;
		security?: Security;
		requests?: Request[];
		responses?: Response[];
	};

	export type ProjectInfo = {
		title: string;
		description: string;
		version: string;
	};

	export enum SecurityType {
		Basic = 'basic',
		APIKey = 'apiKey',
	}

	export enum ParameterLocation {
		Query = 0,
		Header = 1,
		Cookie = 2,
	}

	/**
	 * A description of a security mechanism used on some Resource.
	 */
	export type Security = {
		name: string;
		type: SecurityType;
		paramName: string;
		in: ParameterLocation;
		example: string;
	};

	export type Host = {
		name: string;
		url: string;
		description: string;
	};

	/**
	 * A description of the data format used in a Response.
	 */
	export interface Schema {
		name: string;
		description: string;
		properties: Property[];
		example?: any;
	};

	/**
	 * A property of an object being described by a Schema.
	 */
	export type Property = {
		name: string;
		type: DataType;
		description: string;
		required?: boolean;
	};

	export enum DataType {
		String = 1,
		Object,
		Array,
		Boolean,
		Number,
		//TODO: the rest of primitive types
	}

	export type Header = {
		name: string;
		type: DataType;
		description: string;
		required: boolean;
		example?: string;
		value?: string;
	}

	export type HeaderBag = {} & {
		[h: string]: Header;
	}

	export namespace HeaderBag {
		export function applyToRequest(hb: HeaderBag, opts) {
			for (let hn in hb) {
				let h = hb[hn];
				if (! opts.headers[h.name]) {
					opts.headers[h.name] = [];
				}

				if (! h.example) {
					throw new Error(`The header '${h.name}' has no suitable example to use.`)
				}

				opts.headers[h.name] = h.example;
			}
		}
	}

	/**
	 * A description of a request data a resource expects.
	 */
	export type Request = {
		type: DataType;
		contentType: string;
		schema?: Schema;
		headers?: HeaderBag;
	}

	/**
	 * A description of a response to expect from a Resource.
	 */
	export type Response = Request & {
		statusCode: number;
	};

	export class ResourceNotFoundError extends global.Error {
		constructor(resName?: string) {
			super(resName ? `Resource "${resName}" not found` : "Resource not found");
		}
	}
}

