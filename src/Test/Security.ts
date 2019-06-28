import * as API from '../API';
import * as request from 'request';

export abstract class Security {
	constructor(protected scheme: API.Spec.Security) {}

	abstract authorizeRequest(opts: any);

	public static make(scheme: API.Spec.Security) {
		if (! scheme) {
			return new NoSecurity(scheme);
		}

		switch (scheme.type) {
			case API.Spec.SecurityType.APIKey:
			return new APIKeySecurity(scheme);

			default:
			return new NoSecurity(scheme);
		}
	}
}

export class NoSecurity extends Security {
	authorizeRequest(opts: request.Options) {}
}

export class APIKeySecurity extends Security {
	authorizeRequest(opts: request.Options) {
		switch (this.scheme.in) {
			case API.Spec.ParameterLocation.Header:
				opts.headers[this.scheme.paramName] = this.scheme.example;
				break;
				
			case API.Spec.ParameterLocation.Cookie:
				opts.headers['Cookie'] = `${this.scheme.paramName}=${this.scheme.example}`;
				break;
			
			default:
				throw new Error(`The security location '${this.scheme.in}' is not supported yet.`);
		}
	}
}
