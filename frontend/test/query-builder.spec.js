describe("buildQuery test suite", function() {

    let queryFixtures = TTT.getQueryFixtures();
    // console.log(Object.keys(queryFixtures));
    // console.log(queryFixtures);
    let queryDescriptions = TTT.getQueryDescriptions();
    for (let queryName in queryFixtures) {
        // console.log(queryName);
        if (queryFixtures.hasOwnProperty(queryName)) {
            // console.log("here?");
            debugger;
            if (TTT.hasHtmlFixture(queryName)) {
                // console.log(queryName);
                it(`~Bee${queryName}~Should be able to build a ${queryDescriptions[queryName]}`, function() {
                    TTT.insertHtmlFixture(queryName);
                    debugger;
                    let actualQuery = CampusExplorer.buildQuery(document);
                    let expectedQuery = queryFixtures[queryName];
                    expect(actualQuery).to.equalQuery(expectedQuery);
                });
            }
        }
    }

});