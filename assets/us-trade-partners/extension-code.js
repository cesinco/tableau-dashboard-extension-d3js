// Wrap everything in an anonymous function to avoid polluting the global namespace
//(function() {
    $(document).ready(function() {

        //console.log("Entered document.ready")

        const cell_shading_vert = true; //Usually, want this to be true to see how the change over time per country has changed

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

            var arrVals = [];

            const dataTable = await worksheet.getSummaryDataAsync();

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
                    , "imports": dataTable.data[row][7].value == "%null%" ? "" : dataTable.data[row][7].value
                    , "balance": dataTable.data[row][5].value == "%null%" ? "" : dataTable.data[row][5].value
                }))
            }

            // Next, we want to take the array we just created, and sort it into the appropriate order
            // i.e. first by year, then month number, then continent, then sub-continent, then country name
            arrVals = arrVals.sort(function(a, b) {
                return cmp(
                      [cmp(a.year, b.year), cmp(a.month_num, b.month_num), cmp(a.continent, b.continent), cmp(a.subcontinent, b.subcontinent), cmp(a.country, b.country)]
                    , [cmp(b.year, a.year), cmp(b.month_num, a.month_num), cmp(b.continent, a.continent), cmp(b.subcontinent, a.subcontinent), cmp(b.country, a.country)]
                )
            })

            var table_elem = '<table style="border: 1px solid black; border-collapse: collapse;">';
            for (var row = 0; row < arrVals.length; row++) {
                var row_elem = '<tr>';
                row_elem += `<td style="border: 1px solid black;">${arrVals[row].year}</td>`;
                row_elem += `<td style="border: 1px solid black;">${arrVals[row].month}</td>`;
                row_elem += `<td style="border: 1px solid black;">${arrVals[row].continent}</td>`;
                row_elem += `<td style="border: 1px solid black;">${arrVals[row].subcontinent}</td>`;
                row_elem += `<td style="border: 1px solid black;">${arrVals[row].country}</td>`;
                row_elem += `<td style="border: 1px solid black;">${(arrVals[row].exports).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>`;
                row_elem += `<td style="border: 1px solid black;">${(arrVals[row].imports).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>`;
                row_elem += `<td style="border: 1px solid black;">${(arrVals[row].balance).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>`;
                row_elem += "</tr>";
                table_elem += row_elem;
            }
            table_elem += "</table>";

            //divRender.html(table_elem);

            // Now that we have the array sorted, we want to build up how to display it
            // We will display the year and month as rows, and the geographical hierarchy as colums
            // The values for exports, imports, and balance will be displayed in each cell where
            // the rows and columns intersect
            
            // Create a new empty top-level JSON object whose keys will be the years
            var years = Object({});

            // Loop through each year and add every new year into the 1st level of the new years JSON object
            for(var row = 0; row < arrVals.length; row++) {
                if(!years.hasOwnProperty(arrVals[row].year)) {
                    // If this particular year key doesn't exist yet in our 1st-level JSON object
                    // create a new empty JSON object for each year we are processing which will be keyed on months
                    years[arrVals[row].year] = Object({});
                }
                // Get a reference to this "months" JSON object associated to the current year
                var months = years[arrVals[row].year];
                //if(!months.hasOwnProperty(`${("0" + arrVals[row].month_num).slice(-2)}_${arrVals[row].month}`)) {
                if(!months.hasOwnProperty(arrVals[row].month)) {
                    // If this particular month key doesn't exist yet in our 2nd-level JSON object
                    // create a new empty JSON object for each year/month we are processing which will be keyed on continents
                    //months[`${("0" + arrVals[row].month_num).slice(-2)}_${arrVals[row].month}`] = Object({});
                    months[arrVals[row].month] = Object({});
                }
                // Get a reference to this "continents" JSON object associated to the current year/month
                //var continents = months[`${("0" + arrVals[row].month_num).slice(-2)}_${arrVals[row].month}`];
                var continents = months[arrVals[row].month];
                if (!continents.hasOwnProperty(arrVals[row].continent)) {
                    // If this particular continent key doesn't exist yet in our 3rd-level JSON object
                    // create a new empty JSON object for each year/month/continent we are processing which will be keyed on subcontinents
                    continents[arrVals[row].continent] = Object({});
                }
                // Get a reference to this "subcontinents" JSON object associated to the current year/month/continent
                var subcontinents = continents[arrVals[row].continent];
                if (!subcontinents.hasOwnProperty(arrVals[row].subcontinent)) {
                    // If this particular subcontinent key doesn't exist yet in our 4th-level JSON object
                    // create a new empty JSON object for each year/month/continent/subcontinent we are processing which will be keyed on countries
                    subcontinents[arrVals[row].subcontinent] = Object({});
                }
                var countries = subcontinents[arrVals[row].subcontinent];
                if (!countries.hasOwnProperty(arrVals[row].country)) {
                    countries[arrVals[row].country] = Object({});
                    countries[arrVals[row].country]["exports"] = arrVals[row].exports;
                    countries[arrVals[row].country]["imports"] = arrVals[row].imports;
                    countries[arrVals[row].country]["balance"] = arrVals[row].balance;
                }
            }

            // We need to get a count of rows and columns to span when creating the HTML table
            // in order to merge cells as needed in the row and column headers
            var dict_lengths = {"years": Object.keys(years).length};

            var dict_lengths_cum = {"years":Object.keys(years).length, "months": 0, "continents": 0, "subcontinents": 0, "countries": 0};

            Object.keys(years).forEach(function(k, i) {
                dict_lengths[k] = Object({"months": Object.keys(years[k]).length});
                dict_lengths_cum["months"] += dict_lengths[k]["months"];
                Object.keys(years[k]).forEach(function(kk, ii) {
                    dict_lengths[k][kk] = Object({"continents": Object.keys(years[k][kk]).length});
                    dict_lengths_cum["continents"] += dict_lengths[k][kk]["continents"];
                    Object.keys(years[k][kk]).forEach(function(kkk, iii) {
                        dict_lengths[k][kk][kkk] = Object({"subcontinents": Object.keys(years[k][kk][kkk]).length});
                        dict_lengths_cum["subcontinents"] += dict_lengths[k][kk][kkk]["subcontinents"];
                        Object.keys(years[k][kk][kkk]).forEach(function(kkkk, iiii) {
                            dict_lengths[k][kk][kkk][kkkk] = Object({"countries": Object.keys(years[k][kk][kkk][kkkk]).length});
                            dict_lengths_cum["countries"] += dict_lengths[k][kk][kkk][kkkk]["countries"];
                        })
                    })
                })
            })

            //Construct the structure that will hold our merged cells for row headers
            var years_track = [];
            var months_track = [];
            Object.keys(years).forEach(function(yr) {
                years_track.push({"year": yr, "length": Object.keys(years[yr]).length});
                Object.keys(years[yr]).forEach(function(mn, idx) {
                    months_track.push({"year": yr, "month": mn, "month_num": d3.format('02')(idx+1)})
                }) 
            })

            //divRender.html(JSON.stringify(months_track));

            //Construct the structure that will hold our merged cells for column headers
            var continents_track = [];
            var subcontinents_track = [];
            var countries_track = [];

            Object.keys(years[years_track[0]["year"]][months_track[0]["month"]]).forEach(function(co) {
                continents_track.push({"name": co, "length": Object.keys(years[years_track[0]["year"]][months_track[0]["month"]][co]).length});
                Object.keys(years[years_track[0]["year"]][months_track[0]["month"]][co]).forEach(function(sc) {
                    subcontinents_track.push({"continent": co, "subcontinent": sc, "length": Object.keys(years[years_track[0]["year"]][months_track[0]["month"]][co][sc]).length});
                    Object.keys(years[years_track[0]["year"]][months_track[0]["month"]][co][sc]).forEach(function(cu) {
                        countries_track.push({"continent": co, "subcontinent": sc, "country": cu})
                    })
                })
            })

            //divRender.html(JSON.stringify(countries_track));

            dict_lengths_cum["countries"] = dict_lengths_cum["countries"] / dict_lengths_cum["months"];

            const year0 = Object.keys(dict_lengths).filter(function(v, i) {return v != "years"})[0];
            const month0 = Object.keys(dict_lengths[year0]).filter(function(v, i) {return v != "months"})[0];

            // Here we create the table now that we have all the relevant information about merged rows and columns
            var str_html_table = `
<table class="trade-partners">
    <colgroup span="2" class="header columngroup" />
            `;

            subcontinents_track.forEach(function(itm) {
                str_html_table += `
    <colgroup span="${itm.length}" class="${itm.continent.toLowerCase()} ${itm.subcontinent.toLowerCase()} columngroup" />                 
                `;
            })

            str_html_table += `
    <thead>
        <tr>
            <th rowspan="4">Year</th>
            <th rowspan="4">Month</th>
            <th class="header1" colspan="${dict_lengths_cum["countries"]}">Continent / Subcontinent / Country</th>
        </tr>
        <tr>
            `;

            continents_track.forEach(function(co) {
                var subcontinents_filt = subcontinents_track.filter(function(sc) {
                    return sc.continent == co.name;
                });
                var num_cols = 0;
                subcontinents_filt.map(function(sc) {
                    num_cols += sc.length;
                })
                str_html_table += `<th class="header2" colspan="${num_cols}">${co.name}</th>`;
            })
            str_html_table += `
        </tr>
        <tr>
            `

            continents_track.forEach(function(co) {
                var subcontinents_filt = subcontinents_track.filter(function(sc) {
                    return sc.continent == co.name;
                });
                subcontinents_filt.map(function(sc) {
                    str_html_table += `<th class="header3" colspan="${sc.length}">${sc.subcontinent}</th>`;
                })
            })
            str_html_table += `
        </tr>
        <tr>
            `

            continents_track.forEach(function(co) {
                var subcontinents_filt = subcontinents_track.filter(function(sc) {
                    return sc.continent == co.name;
                });
                subcontinents_filt.map(function(sc) {
                    var country_filt = arrVals.filter(function(d) {
                        return d.year == year0 && d.month == month0 && d.continent == co.name && d.subcontinent == sc.subcontinent
                    })
                    country_filt.forEach(function(cu) {
                        str_html_table += `<th class="header4">${cu.country}</th>`;
                    })
                })
            })
            str_html_table += `
        </tr>
    </thead>
    <tbody>
            `

            var curr_year = "0";
            months_track.forEach(function(itm) {
                str_html_table += `
        <tr>
                `
                if (itm.year != curr_year) {
                    str_html_table += `<th class="year" rowspan="${years_track.filter(function(yr) {return yr.year == itm.year})[0].length}">${itm.year}</th>`;
                    curr_year = itm.year;
                }
                str_html_table += `<th class="month">${itm.month}</th>`;
                continents_track.forEach(function(co) {
                    var subcontinents_filt = subcontinents_track.filter(function(sc) {
                        return sc.continent == co.name
                    })
                    subcontinents_filt.forEach(function(sc) {
                        var curr_vals = arrVals.filter(function(d) {return d.year==itm.year && d.month==itm.month && d.continent==co.name && d.subcontinent==sc.subcontinent}); //.sort(function(a,b) {return a.balance - b.balance});
                        //var dec_place = 1;
                        /* Technically, we don't need this here anymore since we do the color mapping
                        depending on whether the shading is applied vertically (by column) or horizontally (by row)
                        var row_vals = [];
                        if (curr_vals.length > 1) {
                            for(var c=0; c<curr_vals.length; c++) {
                                row_vals.push(curr_vals[c].balance)
                            }
                            var max_row = Math.max.apply(Math, row_vals);
                            var min_row = Math.min.apply(Math, row_vals);
                            var mapped_vals = [];
                            for(var c=0; c<curr_vals.length; c++) {
                                mapped_vals.push(mapNumRange(row_vals[c], min_row, max_row, 0.1, 0.9)); //Instead of using the mapped range from 0.0 to 1.0, use a tighter space between 0.1 and 0.9 - this makes the colors at the extreme ends of the color scale be lighter (for interpolateRdYlGn)
                            }
                        }
                        */
                        //divRender.html(JSON.stringify(curr_vals))
                        curr_vals.forEach(function(v, i) {
                            if (v.balance == "") {
                                str_html_table += `<td class="balance y_${v.year} m_${d3.format('02')(v.month_num)} ${co.name.toLowerCase().replace(/[^a-z]/g, '_')} ${sc.subcontinent.toLowerCase().replace(/[^a-z]/g, '_')} ${v.country.toLowerCase().replace(/[^a-z]/g, '_')}" value=""></td>`
                            } else {
                                /* Technically, we don't need this here anymore since we do the color mapping
                                depending on whether the shading is applied vertically (by column) or horizontally (by row)
                                if (row_vals.length > 0) {
                                    str_html_table += `<td class="balance y_${v.year} m_${d3.format('02')(v.month_num)} ${co.name.toLowerCase().replace(/[^a-z]/g, '_')} ${sc.subcontinent.toLowerCase().replace(/[^a-z]/g, '_')} ${v.country.toLowerCase().replace(/[^a-z]/g, '_')}" data="${mapped_vals[i]}" value="${d3.format('0.3f')(v.balance)}">${d3.format('0,.3f')(v.balance)}</td>`;
                                } else {
                                    str_html_table += `<td class="balance y_${v.year} m_${d3.format('02')(v.month_num)} ${co.name.toLowerCase().replace(/[^a-z]/g, '_')} ${sc.subcontinent.toLowerCase().replace(/[^a-z]/g, '_')} ${v.country.toLowerCase().replace(/[^a-z]/g, '_')}" value="${d3.format('0.3f')(v.balance)}">${d3.format('0,.3f')(v.balance)}</td>`;
                                }
                                */
                                str_html_table += `<td class="balance y_${v.year} m_${d3.format('02')(v.month_num)} ${co.name.toLowerCase().replace(/[^a-z]/g, '_')} ${sc.subcontinent.toLowerCase().replace(/[^a-z]/g, '_')} ${v.country.toLowerCase().replace(/[^a-z]/g, '_')}" value="${d3.format('0.3f')(v.balance)}">${d3.format('0,.3f')(v.balance)}</td>`;
                            }
                        })
                    })
                })
                str_html_table += `
        </tr>
                `
        })

        str_html_table += `
    </tbody>
</table>
        `
            // Draw the table on the extension's "canvas" 
            //divRender.text(str_html_table); //Use this to display raw HTML in the extension's frame
            divRender.html(str_html_table);

            // Now apply the background color for each candidate cell in the table, including adjusting the font color depending on cell color intensity

            if (cell_shading_vert) {
                // We construct two loops, an outer loop that processes each country column,
                // and an inner one that processes each cell in that country column and shades
                // each cell between red (smallest value) and green (largest value)
                countries_track.forEach(function(cntry, idx){
                    var country = cntry.country.toLowerCase().replace(/[^a-z]/g, '_');
                    var col_cells = document.querySelectorAll(`td.balance.${country}`);
                    var arr_cell_vals = [];
                    col_cells.forEach(function(cell, idx) {
                        var curval = Number.parseFloat(cell.getAttribute('value').replace('−', '-'));
                        if (!isNaN(curval)) {
                            arr_cell_vals.push(curval);
                        }
                    });

                    var max_col = Math.max.apply(Math, arr_cell_vals);
                    var min_col = Math.min.apply(Math, arr_cell_vals);

                    col_cells.forEach(function(td, idx) {
                        var colorval = td.getAttribute('value');
                        if (colorval) {
                            colorval = Number.parseFloat(colorval.replace('−', '-'));
                            var mappedcolorval = mapNumRange(colorval, min_col, max_col, 0.1, 0.9); //Instead of using the mapped range from 0.0 to 1.0, use a tighter space between 0.1 and 0.9 - this makes the colors at the extreme ends of the color scale be lighter (for interpolateRdYlGn)
                            var rgbColor = d3.interpolateRdYlGn(mappedcolorval);
                            //console.log(`colorval=${colorval} ; mappedcolorval=${mappedcolorval}; rgbColor=${rgbColor}`)
                            td.style.cssText = `background: ${rgbColor}`;
                            if(mappedcolorval > 0.2 && mappedcolorval < 0.8) {
                                td.style.color = "rgba(0, 0, 0, 1)";
                            }
                        }
                    });
                });
            } else {
                // We construct two loops, an outer loop that processes each year-month row,
                // and an inner one that processes each cell in that year-month row and shades
                // each cell between red (smallest value) and green (largest value)
                months_track.forEach(function(ym, idx){
                    var row_cells = document.querySelectorAll(`td.balance.y_${ym.year}.m_${ym.month_num}`); //["value"]
                    var arr_cell_vals = [];
                    row_cells.forEach(function(cell, idx){
                        var curval = Number.parseFloat(cell.getAttribute('value').replace('−', '-'));
                        if (!isNaN(curval)) {
                            arr_cell_vals.push(curval);
                        }
                    });

                    var max_row = Math.max.apply(Math, arr_cell_vals);
                    var min_row = Math.min.apply(Math, arr_cell_vals);
                    
                    row_cells.forEach(function(td, idx) {
                        var colorval = td.getAttribute('value');
                        if (colorval) {
                            colorval = Number.parseFloat(colorval.replace('−', '-'));
                            var mappedcolorval = mapNumRange(colorval, min_row, max_row, 0.1, 0.9); //Instead of using the mapped range from 0.0 to 1.0, use a tighter space between 0.1 and 0.9 - this makes the colors at the extreme ends of the color scale be lighter (for interpolateRdYlGn)
                            var rgbColor = d3.interpolateRdYlGn(mappedcolorval);
                            //console.log(`colorval=${colorval} ; mappedcolorval=${mappedcolorval}; rgbColor=${rgbColor}`)
                            td.style.cssText = `background: ${rgbColor}`;
                            if(mappedcolorval > 0.2 && mappedcolorval < 0.8) {
                                td.style.color = "rgba(0, 0, 0, 1)";
                            }
                        }
                    });
                })
            }

            //console.log(`str_html_table = ${str_html_table}`)
        }

        async function onFilterChange(filterChangeEvent) {
            divRender.html('<h3>Loading...</h3>')
            const myFilter = await filterChangeEvent.getFilterAsync();
            var postData = `${myFilter.fieldName}: ${myFilter.appliedValues.map(v => v.formattedValue)}`;
            const dashboard = tableau.extensions.dashboardContent.dashboard;
            var worksheet = dashboard.worksheets.find(w => w.name === "Data");
            getWorksheetData(worksheet);
        }

        divRender.html('<h3>Loading...</h3>')

        tableau.extensions.initializeAsync().then(function() {
            //To get the dataSource info, first get a reference to the dashboard object
            const dashboard = tableau.extensions.dashboardContent.dashboard;

            var worksheet = dashboard.worksheets.find(w => w.name === "Data");

            worksheet.addEventListener(tableau.TableauEventType.FilterChanged, onFilterChange);

            getWorksheetData(worksheet);
        })

    })

//})