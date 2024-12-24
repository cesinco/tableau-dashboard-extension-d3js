// Much of this code was taken directly from https://observablehq.com/@d3/zoomable-circle-packing

// Wrap everything in an anonymous function to avoid polluting the global namespace
//(function() {

    $(document).ready(function() {

        var container;

        container = $("#visualization");

        async function getWorksheetData(worksheet) {

            //BTW, it's a lie that getSummaryDataReaderAsync is now supported in new versions of the API
            //const dataTableReader = await worksheet.getSummaryDataReaderAsync();
            //console.log(`dataTableReader.totalRowCount = ${dataTableReader.totalRowCount}`);
            //const dataTable = await dataTableReader.getAllPagesAsync();

            const dataTable = await worksheet.getSummaryDataAsync();

            //container.html(`dataTable = ${JSON.stringify(dataTable["_data"])}`)

            // Set up an array to hold JSON objects (dictionary)
            var arrVals = [];

            for (var row=0; row < dataTable.data.length; row++) {
                arrVals.push(Object({
                      "pickup_borough": dataTable.data[row][0].formattedValue
                    , "pickup_zone": dataTable.data[row][1].formattedValue
                    , "dropoff_borough": dataTable.data[row][2].formattedValue
                    , "dropoff_zone": dataTable.data[row][3].formattedValue
                    , "value": dataTable.data[row][4].value
                }))
            }

            render_visualization(arrVals);
            //container.html(JSON.stringify(arrVals))

        }

        async function onFilterChange(filterChangeEvent) {
            const myFilter = await filterChangeEvent.getFilterAsync();
            var postData = `${myFilter.filedName}: ${myFilter.appliedValues.map(value => value.formattedValue)}`;
            //console.log("********************************************");
            //console.log(postData);
            //console.log("********************************************");
            //console.log(`Filter change detected in worksheet ${filterChangeEvent.worksheet.name}`);
            const dashboard = tableau.extensions.dashboardContent.dashboard;
            var worksheet = dashboard.worksheets.find(w => w.name === "Data");
            getWorksheetData(worksheet);
        }

        function render_visualization(arrVals) {

            //IMPORTANT! Clear any curent contents of the container - without doing this, D3 will not "overwrite" the existing contents
            container.html("");

            // Specify the visualization's dimensions
            const width = 1200;
            const height = 800;
            const marginTop = 0;

            var pickup_borough = Object.fromEntries(d3.groups(arrVals, d => d.pickup_borough, d => d.pickup_zone, d => d.dropoff_borough, d => d.dropoff_zone));
            var total = 0;
            var objTemp;

            //container.html(JSON.stringify(pickup_borough))

            var finalString = "";
            var children1 = [];
            for (var k1 in pickup_borough) {
                var pickup_zone = Object.fromEntries(pickup_borough[k1]);
                var children2 = [];
                for (var k2 in pickup_zone) {
                    var dropoff_borough= Object.fromEntries(pickup_zone[k2]);
                    var children3 = [];
                    for (var k3 in dropoff_borough) {
                        var dropoff_zone = Object.fromEntries(dropoff_borough[k3]);
                        var children4 = [];
                        for (var k4 in dropoff_zone) {
                            finalString += `<p> ${k1} : ${k2} : ${k3} : ${k4} => ${dropoff_zone[k4][0].value}`
                            children4.push(Object({"name": k4, "value": dropoff_zone[k4][0].value}));
                        }
                        total = 0;
                        for (var k in children4) {
                            total += children4[k].value;
                        }
                        children3.push(Object({"name": k3, "value": total, "children": children4}));
                    }
                    total = 0;
                    for (var k in children3) {
                        total += children3[k].value;
                    }
                    children2.push(Object({"name": k2, "value": total, "children": children3}));
                }
                total = 0;
                for (var k in children2) {
                    total += children2[k].value;
                }
                children1.push(Object({"name": k1, "value": total, "children": children2}));
            }

            var data = Object(
                {"name": "flare", "children": children1}
            )

            //container.html(JSON.stringify(data))
            //container.html(finalString)

            var formatComma = d3.format(",");

            // Create the color scale
            const color = d3.scaleLinear()
                .domain([0, 5])
                .range(["hsl(152, 80%, 80%)", "hsl(228, 30%, 40%)"])
                .interpolate(d3.interpolateHcl);

            var sizeScale = d3.scaleSqrt()
                .range([10, 20]); // Set this range to determine minimum and maximum radius sizes of packed circles

            // Compute the layout
            const pack = data => d3.pack()
                .size([width, height])
                .radius(d => sizeScale(d.value))
                .padding(100) // Set this to add space around each circle and prevent text from overlapping
            (d3.hierarchy(data)
                .sum(d => d.value)
                .sort((a, b) => b.value - a.value));

            const root = pack(data);

            // Create the SVG container
            const svg = d3.create("svg")
                .attr("viewBox", `-${width / 2} -${height / 2} ${width}, ${height}`)
                .attr("width", width)
                .attr("height", height)
                .attr("style", `max-width: 100%; height: auto; display: block; margin-top: ${marginTop}px; border: black solid 2px; background: ${false ? "#ccc" : color(0)}; cursor: pointer;`)

            // Append the nodes
            const node = svg.append("g")
                .selectAll("circle")
                .data(root.descendants().slice(1))
                .join("circle")
                .attr("fill", d => d.children ? color(d.depth) : "white")
                .attr("stroke", "#000")
                .attr("pointer-events", d => !d.children ? "none" : null)
                .on("mouseover", function() { d3.select(this).attr("stroke", "#000"); })
                .on("mouseout", function() { d3.select(this).attr("stroke", null); })
                .on("click", (event, d) => focus !== d && (zoom(event, d), event.stopPropagation()));

            // Append the text labels
            const label = svg.append("g")
                .style("font", "10px sans-serif")
                .attr("pointer-events", "none")
                .attr("text-anchor", "middle")
            .selectAll("text")
            .data(root.descendants())
            .join("text")
                .style("fill-opacity", d => d.parent === root ? 1 : 0)
                .style("display", d => d.parent === root ? "inline" : "none")
                .attr("class", d => d.parent === root ? "main" : "inner")
                .html(d => d.data.name + (d.data.value ? " " + formatComma(d.data.value) : " " + formatComma(d3.rollup(d.data.children, v => d3.sum(v, dd => dd.value)))));

            // Create the zoom behavior and zoom immediately to the initial focus node
            svg.on("click", (event) => zoom(event, root));
            let focus = root;
            let view;
            zoomTo([focus.x, focus.y, focus.r *2]);

            container.append(svg.node());
            //container.text(svg.node());

            function zoomTo(v) {
                const k = width / v[2];

                view = v;

                label.attr("transform", d => `translate(${(d.x - v[0]) * k},${(d.y - v[1]) * k})`);
                node.attr("transform", d => `translate(${(d.x - v[0]) * k},${(d.y - v[1]) * k})`);
                node.attr("r", d => d.r * k);
            }

            function zoom(event, d) {
                const focus0 = focus;

                focus = d;

                const transition = svg.transition()
                    .duration(event.altKey ? 7500 : 750)
                    .tween("zoom", d => {
                        const i = d3.interpolateZoom(view, [focus.x, focus.y, focus.r *2]);
                        return t => zoomTo(i(t));
                    });

                label
                    .filter(function(d) { return d.parent === focus || this.style.display === "inline"; })
                    .transition(transition)
                        .style("fill-opacity", d => d.parent === focus ? 1 : 0)
                        .on("start", function(d) { if (d.parent === focus) this.style.display = "inline"; })
                        .on("end", function(d) { if (d.parent !== focus) this.style.display = "none"; })
            }
        }

        //container.html("<h3>Loading...</h3>");

        tableau.extensions.initializeAsync().then(function() {
            //container.html("");

            //To get the dataSource info, first get a reference to the dashboard object
            const dashboard = tableau.extensions.dashboardContent.dashboard;

            var worksheet = dashboard.worksheets.find(w => w.name === "Data");

            worksheet.addEventListener(tableau.TableauEventType.FilterChanged, onFilterChange);

            getWorksheetData(worksheet);
        }, function(err) {
            // Something went wrong in initialization
            console.log("Error while initializaing: " + err.toString());
            $("#visualization").html(err.toString());
        })

    });

//})