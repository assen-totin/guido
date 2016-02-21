/**
 * Per-template loading method. 
 * Will be called whenever the template named 'main2' is attached to a parent. 
 */
function appLoadTemplate_main2() {
	appRun.logger.debug('Entering function appLoadTemplate_main2()...');

	// Table definition (only header, without rows added)
	var paramsTable = {
		div: 'main2_table',
		sort: 2,
		sortControls: {			// We use the built-in font for sor tocntrol. See README for other options.
			sortAsc: 'guido',
			sortDesc: 'guido',
			sortedAsc: 'guido',
			sortedDesc: 'guido',
		},
		direction: 'desc',
		page: 4,
		pageControls: {
			position: ['bottom'],
			align: ['right'],
			css: 'page',
		},
		css: 'table',
		header: {
			css: 'th',
			cells: [
				{sort: true, content: _('Country')},
				{content: _('City')},
				{sort: true, content: _('Population')},
			]
		},
		rows: []
	};

/*
	// You can load the data for the table using an AJAX request,
	// then process it in the .done() method to fill the form object
	// before calling the guidoTable() method.

	// Just as an example we'll fill the table from a static array
*/
	var data = [
		{
			country: 'China',
			city: 'Beijing',
			population: 20693000,
		},
		{
			country: 'Japan',
			city: 'Tokyo',
			population: 13189000,
		},
		{
			country: 'Russia',
			city: 'Moscow',
			population: 11541000,
		},
		{
			country: 'Korea',
			city: 'Seoul',
			population: 10370000,
		},
		{
			country: 'Indonesia',
			city: 'Jakarta',
			population: 10188000,
		},
		{
			country: 'Mexico',
			city: 'Mexico City',
			population: 8851000,
		},
		{
			country: 'United Kingdom',
			city: 'London',
			population: 8630000,
		},
		{
			country: 'Peru',
			city: 'Lima',
			population: 8481000,
		},
		{
			country: 'Thailand',
			city: 'Bangkok',
			population: 8249000,
		},
		{
			country: 'Iran',
			city: 'Tehran',
			population: 8154000,
		},
		{
			country: 'Columbia',
			city: 'Bogota',
			population: 7613000,
		},
		{
			country: 'Egypt',
			city: 'Cairo',
			population: 7438000,
		},
		{
			country: 'Iraq',
			city: 'Baghdad',
			population: 7216000,
		},
		{
			country: 'Vietnam',
			city: 'Hanoi',
			population: 7087000,
		},
		{
			country: 'Bangladesh',
			city: 'Dhaka',
			population: 6970000,
		},
		{
			country: 'Singapore',
			city: 'Singapore',
			population: 5535000,
		},
		{
			country: 'Turkey',
			city: 'Ankara',
			population: 5150000,
		},

	];

	for (var i=0; i<data.length; i++) {
		var row = {
			cells: [],
		};

		var cellCountry = {
			content: data[i].country,
		};
		row.cells.push(cellCountry);

		var cellCity = {
			content: data[i].city,
		};
		row.cells.push(cellCity);

		var cellPopulation = {
			content: data[i].population,
			css: 'numeric',
		};
		row.cells.push(cellPopulation);


		paramsTable.rows.push(row);
	}

	var t = new guidoTable(paramsTable, function(){
		// Add here any actins you need taken after the table is rendered.
	});
}

/**
 * Per-template unloading method. 
 * Will be called whenever the template named 'main2' is detached from a parent. 
 */
function appUnloadTemplate_main2() {
	appRun.logger.debug('Entering function appUnloadTemplate_main2()...');
	// Add your code below
}

