import {InsightError} from "./IInsightFacade";
import Decimal from "decimal.js";

export default class RowsSelector {
    private allrows: any[] = [];
    constructor(allrows: any[]) {
        this.allrows = allrows;
    }
    public static wildCardHelper(databaseinfo: string, userinput: string): boolean {
       if (databaseinfo === "" || userinput === "") {
           return false;
       }
       if (userinput.includes("*")) {
           if (userinput.indexOf("*") === 0 && userinput[userinput.length - 1] !== "*") {
               let userinputsub = userinput.substring(1, userinput.length);
               let startindex = databaseinfo.length - userinputsub.length;
               if (startindex < 0) {
                   return false;
               }
               let databaseinfosub = databaseinfo.substring(startindex, databaseinfo.length);
               return userinputsub === databaseinfosub;
           } else if (userinput.indexOf("*") === userinput.length - 1 ) {
               let userinputsub = userinput.substring(0, userinput.length - 1);
               let endindex = userinputsub.length;
               if (endindex > databaseinfo.length) {
                   return false;
               }
               let databaseinfosub = databaseinfo.substring(0, endindex);
               return userinputsub === databaseinfosub;
           } else if (userinput.indexOf("*") === 0 && userinput[userinput.length - 1] === "*") {
               let userinputsub = userinput.substring(1, userinput.length - 1);
               return databaseinfo.includes(userinputsub);
           }
       } else {
           return databaseinfo === userinput;
       }
    }
    public static keepcommon(array1: any[], array2: any[]): any[] {
        if (array1 === [] ) {return array1; }
        if (array2 === [] ) { return array2; } else {
            let set = new Set();
            let ret: any[] = [];
            array1.forEach((element) => {
                set.add(element);
            });
            array2.forEach((element) => {
                if (set.has(element)) {
                    ret.push(element);
                }
            });
            return ret;
        }
    }
    public static keepboth(array1: any[], array2: any[]) {
        if (array1 === []) { return array2; } if (array2 === []) { return array1; } else {
            let set = new Set();
            let ret = array1;
            array1.forEach((element) => {
                set.add(element);
            });
            array2.forEach((element) => {
                if (!set.has(element)) {
                    ret.push(element);
                }
            });
            return ret;
        }
    }
    public reverse(array1: any[]) {
        let self = this;
        if (array1 === null) {
            return self.allrows; } else {
            let set = new Set();
            let ret: any[] = [];
            array1.forEach((element) => {
                set.add(element);
            });
            self.allrows.forEach((element) => {
                if (!set.has(element)) {
                    ret.push(element);
                }
            });
            return ret;
        }
    }
    public selectrowM(key: string, value: number, identifier: string): any[] {
        let ret: any[] = [];
        let self = this;
        switch (identifier) {
            case "EQ":
                self.allrows.forEach((element) => {
                    if (element.hasOwnProperty(key) && element[key] === value) {
                        ret.push(element); }
                });
                break;
            case "GT":
                self.allrows.forEach((element) => {
                    if (element.hasOwnProperty(key) && element[key] > value) {
                        ret.push(element); }
                });
                break;
            case "LT":
                self.allrows.forEach((element) => {
                    if (element.hasOwnProperty(key) && element[key] < value) {
                        ret.push(element); }
                });
                break;
        }
        return ret;
    }
    public selectrowS(key: string, value: string): any[] {
        let self = this;
        if (value === "*" || value === "**") { return self.allrows; }
        let ret: any[] = [];
        let regexp = new RegExp(/^[*]?[^*]*[*]?$/g);
        let s = value.match(regexp); if (s === null) { throw new InsightError("IS no match"); }
        if (s.length !== 1 || s[0] !== value) {
            throw new InsightError("key doesn't match");
        } else {
            self.allrows.forEach((element) => {
                if (RowsSelector.wildCardHelper(element[key], value)) {
                    ret.push(element); }
            });
        }
        return ret;
    }
    public static findSumInArray(array: any[], eachkey: any): number {
        let sum = new Decimal(0.0);
        array.forEach((eachrow) => {
            let value = new Decimal(eachrow[eachkey]);
            sum = sum.add(value);
        });
        return Number(sum.toFixed(2));
    }
    public static findMinInArray(array: any[], eachkey: any): number {
        let ret = array[0][eachkey];
        array.forEach((eachrow) => {
            if (eachrow[eachkey] < ret) {
                ret = eachrow[eachkey];
            }
        });
        return ret;
    }
    public static findMaxInArray(array: any[], eachkey: any): number {
        let ret = array[0][eachkey];
        array.forEach((eachrow) => {
            if (eachrow[eachkey] > ret) {
                ret = eachrow[eachkey];
            }
        });
        return ret;
    }
    public static findAvgInArray(array: any[], eachkey: any): number {
        let sum = new Decimal(0.0);
        array.forEach((eachrow) => {
            let value = new Decimal(eachrow[eachkey]);
            sum = sum.add(value);
        });
        let avg = sum.toNumber() / array.length;
        let ret = Number(avg.toFixed(2));
        return ret;
    }
    public static findCountInArray(array: any[], eachkey: any): number {
        let testset: Set<any> = new Set();
        array.forEach((eachrow) => {
            testset.add(eachrow[eachkey]);
        });
        return testset.size;
    }
    public static cmptAcrsEachrowinGroup(array: any[], realapplyobj: any) {
        let ret = array[0];
        Object.keys(realapplyobj).forEach((eachkey: any) => {
            let applyToken = Object.keys(realapplyobj[eachkey])[0];
            switch (applyToken) {
                case "MAX":
                    ret[eachkey] = RowsSelector.findMaxInArray(array, eachkey);
                    break;
                case "MIN":
                    ret[eachkey] = RowsSelector.findMinInArray(array, eachkey);
                    break;
                case "AVG":
                    ret[eachkey] = RowsSelector.findAvgInArray(array, eachkey);
                    break;
                case "COUNT":
                    ret[eachkey] = RowsSelector.findCountInArray(array, eachkey);
                    break;
                case "SUM":
                    ret[eachkey] = RowsSelector.findSumInArray(array, eachkey);
                    break;
            }
        });
        return ret;
    }
}
