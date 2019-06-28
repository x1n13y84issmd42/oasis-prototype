import * as API from '../API';
import { Test } from './Test';
import { Response as request_response } from 'request';
import { ILogger } from './Logger';
import { Data } from './Data';

export class Header extends Test {
	constructor(protected spec: API.Spec.Header, logger: ILogger) {
		super(logger);
	}

	test(resp: request_response) {
		let h = this.spec;
	
		let headerTypeTester = Data.getTypeTester(h.type);
		if (! headerTypeTester) {
			throw new Error(`Could not determine the correct type tester for the '${this.spec.name}' header.`);
		}

		let headerInput = resp.headers[h.name.toLocaleLowerCase()];
		let headerHasValue = headerInput !== undefined;
		let headerReqOK = (headerHasValue && h.required) || !h.required;
		let headerTypeOK = (headerReqOK && headerHasValue && headerTypeTester(headerInput)) || !h.required;

		if (! headerReqOK) {
			this.logger.headerHasNoValue(this.spec);
		}

		if (! headerTypeOK) {
			this.logger.headerHasWrongType(this.spec);
		}

		//TODO: check value against this.spec.example

		return headerReqOK
	}
}
