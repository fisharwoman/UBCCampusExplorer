// tslint:disable
import Log from "../Util";
import {IInsightFacade, InsightDataset, InsightDatasetKind, ResultTooLargeError} from "./IInsightFacade";
import {InsightError, NotFoundError} from "./IInsightFacade";
import { AssertionError, throws, deepStrictEqual } from "assert";
import Queryparser from "./Queryparser";
import { acceptParser } from "restify";
import * as JSZip from "jszip";
import * as fs from "fs-extra";
import { checkValidDatabase,processCoursesFile, saveDatasetList, parseFileNamesIfCoursesOrRoomstype, processBasedonInsightType } from "./HelperAddDataset";
const parse5 = require("parse5");
import { addListener } from "cluster";
import QueryValidator from "./QueryValidator";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export interface IHash {
    [id: string]: any[];
}

export interface EHash {
    [kind: string]: IHash;
}

export default class InsightFacade implements IInsightFacade {

public datasetsHash: EHash = {};
public addedDatabase: InsightDataset[] = [];

    constructor() {
        Log.trace("InsightFacadeImpl::init()");
    }

    public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
        const validSectionsOrRooms: any[] = [];
        const coursesKeys: string[] = ['Subject', 'Course', 'Avg', 'Professor', 'Title', 'Pass', 'Fail','Audit','id','Year'];
        const fileNames: string[] = [];
        checkValidDatabase(id, content, kind);
        // ** code partially removed to adhere to collaboration policy
    // * and to benefit future cohorts */
        return JSZip.loadAsync(content, {base64: true}).then((zip) => {
            const files: Promise<string>[] = [];
            zip.forEach((path, object) => {
                parseFileNamesIfCoursesOrRoomstype(path, object, files, fileNames);
            });
    // ** code partially removed to adhere to collaboration policy
    // * and to benefit future cohorts */
        })
        .then( (files) => {
            // console.log("finiahed")
            // return this.addValidFilesonly(files, fileNames, coursesKeys, validSectionsOrRooms, kind, id);

        }).then ( () => {
            // console.log("also");
           // ** code partially removed to adhere to collaboration policy
    // * and to benefit future cohorts */
            // ** code partially removed to adhere to collaboration policy
    // * and to benefit future cohorts */
             return Promise.resolve(Object.keys(this.datasetsHash[kind]));
        })
        .catch( (err) => {
            if (!(err instanceof InsightError)) {
                throw new InsightError(err);
            }
            throw err;
        }).catch( (err) => {
            throw err;
        });
    }

    private addValidFilesonly = async (files: string[], fileNames: string[],
        coursesKeys: string[], validSectionsOrRooms: any[], kind: InsightDatasetKind, id: string) => {
                await processBasedonInsightType(kind, files, coursesKeys, validSectionsOrRooms, fileNames);
              // ** code partially removed to adhere to collaboration policy
    // * and to benefit future cohorts */
                   // ** code partially removed to adhere to collaboration policy
    // * and to benefit future cohorts */
                    return saveDatasetList(this.datasetsHash);
                // ** code partially removed to adhere to collaboration policy
    // * and to benefit future cohorts */}
    };


    public removeDataset(id: string): Promise<string> {
        // ** code partially removed to adhere to collaboration policy
    // * and to benefit future cohorts */
            try {
    // ** code partially removed to adhere to collaboration policy
    // * and to benefit future cohorts */
                this.addedDatabase = this.addedDatabase.filter(name => id != id);
                return Promise.resolve(id);
                } catch (err) {
                        if (err instanceof Error) {
                            throw new InsightError(err);
                        } throw err;
                }
        }


    public listDatasets(): Promise<InsightDataset[]> {
        const outputList: InsightDataset[] = [];
        Object.keys(this.datasetsHash).forEach( courseOrRm => {
            const setIds = Object.keys(this.datasetsHash[courseOrRm]);
            setIds.forEach ((id) => {
       // ** code partially removed to adhere to collaboration policy
    // * and to benefit future cohorts */
                // let dataset: InsightDataset = {
// ** code partially removed to adhere to collaboration policy
    // * and to benefit future cohorts */
                })
                // outputList.push(dataset);
            // })

        // })
        // console.log("listtt: " + outputList);
        return Promise.resolve(outputList);

    })
    }

    public performQuery(query: any): Promise <any[]> {
        const self = this;
        let finalresult: any[] = [];
        return new Promise(function (resolve, reject) {
            try {
                let queryvalidator: QueryValidator = new QueryValidator();
                let isCourse = queryvalidator.validatequery(query);
                let parser: Queryparser = new Queryparser(queryvalidator.queryinfo);
                let DATATYPE = "";
// ** code partially removed to adhere to collaboration policy
// * and to benefit future cohorts */
                if (isCourse) {
                    finalresult = parser.executeQuery(query, self.datasetsHash['courses']);
                } else {
                    finalresult = parser.executeQuery(query, self.datasetsHash['rooms']);
                }
            } catch (error) {
                if (error instanceof InsightError || error instanceof ResultTooLargeError) {
                    reject(error);
                } else {
                    reject (new InsightError(error));
                }
            }
            resolve(finalresult);
        });
    }
    }
}
