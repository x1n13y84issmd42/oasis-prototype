import * as API from '../API';
import { Response as request_response } from 'request';
import { Schema } from './Schema';
import * as _ from 'lodash';
import { Test } from './Test';
import { ILogger } from './Logger';
import { Header } from './Header';

/**
 * Response test.
 * Checks basic response props such as status code, content type & other headers.
 */
export class Response extends Test {
	protected constructor(protected spec: API.Spec.Response, logger: ILogger) {
		super(logger);
	}

	//TODO: rethink the `schema` argument and where it really belongs
	test(input: request_response, schema?): boolean {
		let headersOK = true;

		if (this.spec.headers) {
			for (let hn in this.spec.headers) {
				let h = this.spec.headers[hn];
				headersOK = headersOK && (new Header(h, this.logger).test(input));
			}
		}

		let statusOK = input.statusCode == this.spec.statusCode;
		let inputCT = input.headers["content-type"];
		inputCT = inputCT && inputCT.split(';')[0];
		let ctOK = (this.spec.contentType && inputCT === this.spec.contentType) || !this.spec.contentType;

		if (! statusOK) {
			this.logger.responseHasWrongStatus(this.spec, input.statusCode);
		}

		if (! ctOK) {
			this.logger.responseHasWrongContentType(this.spec, input.headers["content-type"]);
		}

		return statusOK && ctOK && headersOK;
	}

	public static make(spec: API.Spec.Response, logger: ILogger) {
		switch (spec.contentType) {
			case 'application/json':
				let response = ({
					[API.Spec.DataType.Array]: new ArrayJSONResponse(spec, logger),
					[API.Spec.DataType.Object]: new ObjectJSONResponse(spec, logger),
				} as {[t:number]: JSONResponse})[spec.type];

				if (! response) {
					throw new Error(`Unknown JSON response data type: '${spec.type}'`);
				}

				return response;
			
			default:
				return new Response(spec, logger);
		}
	}
}


/**
 * A test for JSONs. Checks responses against a model schema.
 */
export class JSONResponse extends Response {
	constructor(spec: API.Spec.Response, logger: ILogger) {
		super(spec, logger);
	}

	protected parse(resp: request_response) {
		let errEmptyJSON = new Error(`Got an empty JSON response.`);
	
		let json = resp.toJSON();
		if (!(json && json.body)) {
			throw errEmptyJSON;
		}

		let body = JSON.parse(json.body);
		if (! body) {
			throw errEmptyJSON;
		}

		return body;
	}

	test(resp: request_response, schema?): boolean {
		let superOK = super.test(resp, schema);

		if (superOK) {
			let schemaT = new Schema(this.spec.schema, this.logger);
			return schemaT.test(schema);
		}

		return false;
	}
}

/**
 * Tests if an endpoint responds with arrays.
 */
export class ArrayJSONResponse extends JSONResponse {
	test(resp: request_response, schema?): boolean {
		let input = this.parse(resp);
		let arrayOK = _.isArray(input);
		let inputArray = input as Array<any>;
		let arrayContentsOK = inputArray.reduce((res, sch) => {
			return res && super.test(resp, sch);
		}, true);

		if (! arrayOK) {
			this.logger.responseExpectedArray(this.spec, input);
		}

		return arrayOK && arrayContentsOK;
	}
}

/**
 * Tests if an endpoint responds with object.
 */
export class ObjectJSONResponse extends JSONResponse {
	test(resp: request_response, schema?): boolean {
		let input = this.parse(resp);
		let objectOK = _.isObject(input);
		if (! objectOK) {
			this.logger.responseExpectedArray(this.spec, input);
		}
		return objectOK && super.test(resp, input);
	}
}
