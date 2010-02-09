const WNDB = {
	
	addEntry : function(form){
		var entryAttrs = {};
		for(var e=0;e<form.elements.length;e++){
			var el = form.elements[e];
			entryAttrs[el.name] = el.value;
		}
		var entry = new Entry(entryAttrs);
	},
	
	genericDataHandler : function(transaction, results){
		console_log("DataHandler");
		console_log(results);
	}, 

	genericErrorHandler : function(transaction, error){
		console_log("DB Error");
		console_log(error);
	},
	
	dropTable : function(tableName){
		$JSDB.transaction(
	   	  function (transaction) {
				  transaction.executeSql("DROP TABLE IF EXISTS "+tableName+";", [], 
															 	function(transation, results){
																	console_log("Dropped table "+tableName);
																	console_log(results);
																}.bind(this),
																function(transation, errors){
																	console_log("Error dropping table "+tableName);
																	console_log(errors);																
																}.bind(this));
			}.bind(this)
		);	
	},

	resetDatabase : function(){
	    for(var m=0;m<$allModels.length;m++){
			var model = $allModels[m];
			WNDB.dropTable(model.tableName());
			if(model.relationships){
			    for(var r in model.relationships){
			        var relationship = model.relationships[r];
			        WNDB.dropTable(relationship.tableName());
			    }
		    }
		}
		WNDB.dropTable('schema_info');
	},	
	
	setSchemaVersion : function(versionNumber){
    	$JSDB.transaction(
           	function (transaction) {
	            var createQuery = 'CREATE TABLE IF NOT EXISTS schema_info(version INTEGER NOT NULL PRIMARY KEY);';
	            transaction.executeSql(createQuery, [], function(trans, results){
	                // The table was created
	                console_log('Created schema_info table');
	                // Set the initial version to 0
				    console_log('Inserting schema version '+versionNumber);
	                transaction.executeSql("INSERT INTO schema_info(version) VALUES(?);", [versionNumber], WNDB.genericDataHandler, WNDB.genericErrorHandler);
				}.bind(this), function(trans, results){
				    // If the table already existed, update the schema version
				    console_log('Updating schema version to '+versionNumber);
               	    transaction.executeSql("UPDATE schema_info SET version = ?;", [versionNumber], WNDB.genericDataHandler, WNDB.genericErrorHandler);    				
				});
			}.bind(this)
		);
	},

	createTables : function(models){
	    for(var m=0;m<models.length;m++){	        
			var model = models[m];
			// Create table
        	$JSDB.transaction(
               	function (transaction) {
           	        var tableName = this.tableName();
    				console_log('creating '+tableName);
    				// This will fail if the table already exists
    				var createQuery = 'CREATE TABLE '+tableName+'(id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT';
    				for(var attrName in this.attributes){
    					if(attrName != 'id'){
    						switch(this.attributes[attrName]){
    							case DBTypes.string:
    							  createQuery += ", "+attrName+" VARCHAR(255)";
    							  break;
    							case DBTypes.text:
    								createQuery += ", "+attrName+" TEXT";
    							  break;
    							case DBTypes.integer:
    								createQuery += ", "+attrName+" INTEGER";
    								break;
    							case DBTypes.float:
    								createQuery += ", "+attrName+" FLOAT";
    								break;
    							case DBTypes.datetime:
    								createQuery += ", "+attrName+" DATE";
    								break;
    							case DBTypes.boolean:
                                    createQuery += ", "+attrName+" BOOLEAN default 0";
    								break;
    						}									
    					}
    				}
    				createQuery += ');'					
    				                    
    				transaction.executeSql(createQuery, [], function(transation, results){    				    
    				    // This will be skipped if the table already exists.
    				    
    				    // Create the Indexes on the table
    				    if(this.indexes && this.indexes.length > 0){
    				        $JSDB.transaction(
                           	    function (transaction) {
                           	        var tableName = this.tableName();
                           	        for(var ix=0;ix<this.indexes.length;ix++){
                           	            var indexColumn = this.indexes[ix];
                               	        var indexQuery = 'CREATE INDEX IF NOT EXISTS '+tableName+'_'+indexColumn+' ON '+tableName+' ('+indexColumn+');'
                                   	    transaction.executeSql(indexQuery, [], WNDB.genericDataHandler, WNDB.genericErrorHandler);
                           	        }
                           	    }.bind(this)
                       	    );        				    
    				    }
    				    
    				    // Add default (fixture) data                          
    				    $JSDB.transaction(
                       	    function (transaction) {
            				    var fixtureData = WNDBFixtures[this.className];
                                if(fixtureData){
                                    for(var f=0;f<fixtureData.length;f++){
                                        var record = new this(fixtureData[f]);
                                        record.save();
                                    }                            
                                }
                            }.bind(this)
                        );
                            				        				    				    
    				}.bind(this), WNDB.genericErrorHandler);	            
    								    
    			}.bind(model)
            );
            
            // Create join tables
			if(model.relationships){
			    for(relationshipName in model.relationships){
			        var relationship = model.relationships[relationshipName];			    
			        switch(relationship.relationshipType){
			            case DBRelationships.manyToMany:
    			            $JSDB.transaction(
                               	function (transaction) {
            			            // Add the join table for ManyToMany relationships
                               	    var myTableName = this.ownerModel.tableName();
                			        var relatedTableName = this.relatedModel.tableName();    			        			        
                			        var tableName = [myTableName, relatedTableName].sort().join('_');
                			        console_log('Creating join table: '+tableName);
                                    var myKey = this.ownerModel.className.toLowerCase()+'_id';
                                    var foreignKey = this.relatedModel.className.toLowerCase()+'_id';
                    
            			            var createQuery = 'CREATE TABLE '+tableName+'('+myKey+' INTEGER, '+foreignKey+' INTEGER);';
                               	    transaction.executeSql(createQuery, [], WNDB.genericDataHandler, WNDB.genericErrorHandler);
                           	    
                               	    var indexQuery = 'CREATE UNIQUE INDEX IF NOT EXISTS joinIndex_'+tableName+' ON '+tableName+' ('+myKey+', '+foreignKey+');';                               	                                   	    
                               	    transaction.executeSql(indexQuery,  [], WNDB.genericDataHandler, WNDB.genericErrorHandler);
                           	    }.bind(relationship)
                       	    );    					
			            break;
			            case DBRelationships.hasMany:
                            // No index. This index is created w/ belongsTo
			            break;
			            case DBRelationships.hasOne:
			                // No index. Same as hasMany.
			            break;
			            case DBRelationships.belongsTo:
			                // No index. This should be handled by the schema.
			            break;			            
			        }
			    }
			}			
        }
	}
}

var $JSDB = null;

try {
    if (!window.openDatabase) {
        alert('Database not supported');
    } else {
        var shortName = WNDatabaseInfo.DBName;
        var version = WNDatabaseInfo.SchemaVersion; // Found in wn_schema.js
        var displayName = WNDatabaseInfo.DisplayName; //            
        var maxSize = WNDatabaseInfo.MaxSize; // in bytes
        $JSDB = openDatabase(shortName, version, displayName, maxSize);
    }
} catch(e) {
    // Error handling code goes here.
    if (e == DBErrors.DBVersionError) {
        alert("Invalid database version.");
    } else {
        alert("DB error "+e+".");
    }
}