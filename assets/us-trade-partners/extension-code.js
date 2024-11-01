// Wrap everything in an anonymous function to avoid polluting the global namespace
//(function() {
    $(document).ready(function() {

        //console.log("Entered document.ready")

        const divRender = $("#container");

        const cmp = function(x, y) {
            return x > y ? 1 : x < y ? -1 : 0;
        }

        const mapNumRange = function(num, inMin, inMax, outMin, outMax) {
            return ((num - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
        }

        async function getWorksheetData(worksheet) {

            var finalString = "";
            var partialString = "";

            //BTW, it's a lie that getSummaryDataReaderAsync is now supported in new versions of the API
            //const dataTableReader = await worksheet.getSummaryDataReaderAsync();
            //console.log(`dataTableReader.totalRowCount = ${dataTableReader.totalRowCount}`);
            //const dataTable = await dataTableReader.getAllPagesAsync();

            //finalString = dataTableReader.data.length;

            var arrVals = [];

            const dataTable = await worksheet.getSummaryDataAsync();

            //console.log(`dataTable.data.length = ${dataTable.data.length}`)
            console.log(JSON.stringify(dataTable.data[0]))

            // We know that the data will be reported in the following index order for each row of data
            // So we make an array of dictionary (JSON) objects with item in the array representing a row
            // and each property of the JSON receiving one of the values reported
            for (var row = 0; row < dataTable.data.length; row++) {
                arrVals.push(Object({
                      "year": dataTable.data[row][0].value
                    , "month": dataTable.data[row][1].formattedValue
                    , "month_num": dataTable.data[row][1].value
                    , "continent": dataTable.data[row][2].value
                    , "subcontinent": dataTable.data[row][3].value
                    , "country": dataTable.data[row][4].value
                    , "exports": dataTable.data[row][6].value == "%null%" ? "" : dataTable.data[row][6].value
                    , "imports": dataTable.data[row][5].value == "%null%" ? "" : dataTable.data[row][5].value
                    , "balance": dataTable.data[row][7].value == "%null%" ? "" : dataTable.data[row][7].value
                }))
            }

            // Next, we want to take the array we just created, and sort it into the appropriate order
            // i.e. first by year, then month number, then continent, then sub-continet, then country name
            arrVals = arrVals.sort(function(a, b) {
                return cmp(
                      [cmp(a.year, b.year), cmp(a.month_num, b.month_num), cmp(a.continent, b.continent), cmp(a.subcontinent, b.subcontinent), cmp(a.country, b.country)]
                    , [cmp(b.year, a.year), cmp(b.month_num, a.month_num), cmp(b.continent, a.continent), cmp(b.subcontinent, a.subcontinent), cmp(b.country, a.country)]
                )
            })

            divRender.html('<h3>' + JSON.stringify(arrVals[0]) + "<br><br>" + JSON.stringify(arrVals[1]) + '</h3>');

            // Now that we have the array sorted, we want to build up how to display it
            // We will display the year and month as rows, and the geographical hierrchy as colums
            // The values for exporrts, imports, and balance will be displayed in each cell where
            // the rows and columns intersect
            
            // Create a new empty top-level JSON object whose keys will be the years
            var dict_table = Object({});
            var us_exports = Object({});
            var us_imports = Object({});
            var us_balance = Object({});

            // Loop through each year and add every new year into the 1st level of the new dict_table JSON object
            for(var row = 0; row < arrVals.length; row++) {
                if(!dict_table.hasOwnProperty(arrVals[row].year)) {
                    // If this particular year key doesn't exist yet in our 1st-level JSON object
                    // create a new empty JSON object for each year we are processing which will be keyed on months
                    dict_table[arrVals[row].year] = Object({});
                }
                // Get a reference to this "months" JSON object associated to the current year
                var months = dict_table[arrVals[row].year];
                if(!months.hasOwnProperty(arrVals[row].month)) {
                    // If this particular month key doesn't exist yet in our 2nd-level JSON object
                    // create a new empty JSON object for each year/month we are processing which will be keyed on continents
                    months[arrVals[row].month] = Object({});
                }
                // Get a reference to this "continents" JSON object associated to the current year/month
                var continents = months[arrVals[row].month];
                if (!continents.hasOwnProperty(arrVals[row].subcontinent)) {
                    // If this particular continent key doesn't exist yet in our 3rd-level JSON object
                    // create a new empty JSON object for each year/month/continent we are processing which will be keyed on subcontinents
                    continents[arrVals[row].subcontinent] = Object({});
                }
                // Get a reference to this "subcontinents" JSON object associated to the current year/month/continent
                var subcontinents = continents[arrVals[row].subcontinent];
                if (!subcontinents.hasOwnProperty(arrVals[row].country)) {
                    // If this particular subcontinent key doesn't exist yet in our 4th-level JSON object
                    // create a new empty JSON object for each year/month/continent/subcontinet we are processing which will be keyed on countries
                    subcontinents[arrVals[row].country] = Object({});
                }
                var countries = subcontinents[arrVals[row].country];
                //if (!countries.hasOwnProperty("exports")) {
                    countries["exports"] = arrVals[row].exports;
                    countries["imports"] = arrVals[row].imports;
                    countries["balance"] = arrVals[row].balance;
                //}
                //us_exports[arrVals[row].country][arrVals[row].year][arrVals[row].month] = arrVals[row].exports;
                //us_imports[arrVals[row].country][arrVals[row].year][arrVals[row].month] = arrVals[row].imports;
                //us_balance[arrVals[row].country][arrVals[row].year][arrVals[row].month] = arrVals[row].balance;
            }

            //$("#container").html(JSON.stringify(countries));
        }

        // We need to get a count of rows and columns to span when creating the HTML table
        // in order to merge cells as needed in the row and column headers
        /*
        var dict_lengths = {"years": Object.keys(dict_table).length};

        var dict_lengths_cum = {"years":Object.keys(dict_table).length, "months": 0, "continents": 0, "subcontinents": 0, "countries": 0};

        Object.keys(dict_table).forEach(function(k, i) {
            dict_lengths[k] = Object({"months": Object.keys(dict_table[k]).length});
            dict_lengths_cum["months"] += dict_lengths[k]["months"];
            Object.keys(dict_table[k]).forEach(function(kk, ii) {
                dict_lengths[k][kk] = Object({"continents": Object.keys(dict_table[k][kk]).length});
                dict_lengths_cum["continents"] += dict_lengths[k][kk]["continents"];
                Object.keys(dict_table[k][kk]).forEach(function(kkk, iii) {
                    dict_lengths[k][kk][kkk] = Object({"subontinents": Object.keys(dict_table[k][kk][kkk]).length});
                    dict_lengths_cum["subcontinents"] += dict_lengths[k][kk][kkk]["subcontinents"];
                    Object.keys(dict_table[k][kk][kkk]).forEach(function(kkkk, iiii) {
                        dict_lengths[k][kk][kkk][kkkk] = Object({"countries": Object.keys(dict_table[k][kk][kkk][kkkk]).length});
                        dict_lengths_cum["countries"] += dict_lengths[k][kk][kkk][kkkk]["countries"];
                    })
                })
            })
        })

        console.log(`dic_length => ${JSON.stringify(dict_lengths)}`)
        */

        async function onFilterChange(filterChangeEvent) {
            divRender.html('<h3>Loading...</h3>')
            const myFilter = await filterChangeEvent.getFilterAsync();
            var postData = `${myFilter.fieldName}: ${myFilter.appliedValues.map(v => v.formattedValue)}`;
            //var postData = `${myFilter.fieldName}: ${JSON.stringify(myFilter.appliedValues)}`;
            console.log("##############################################################")
            console.log(postData);
            console.log("##############################################################")
            console.log(`Filter change event detected in worksheet ${filterChangeEvent.worksheet.name}`);
            const dashboard = tableau.extensions.dashboardContent.dashboard;
            var worksheet = dashboard.worksheets.find(w => w.name === "Data");
            getWorksheetData(worksheet);
        }

        divRender.html('<h3>Loading...</h3>')

        tableau.extensions.initializeAsync().then(function() {
            //const divRender = $("#container");

            //divRender.html('Hello there')

            //To get the dataSource info, first get a reference to the dashboard object
            const dashboard = tableau.extensions.dashboardContent.dashboard;

            var worksheet = dashboard.worksheets.find(w => w.name === "Data");

            worksheet.addEventListener(tableau.TableauEventType.FilterChanged, onFilterChange);

            getWorksheetData(worksheet);
        })

    })

//})