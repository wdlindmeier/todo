$allModels = [];

// Convert the schema info into subclasses of Model

// Here we're just instantiating every subclass so we can refer to them in the main loop below.
// This is helpful for creating relationships.
for(var modelName in WNDatabaseInfo.Schema){  
  
  this[modelName] = function(instanceAttributes){ this.initialize(instanceAttributes); };

}

for(var modelName in WNDatabaseInfo.Schema){
  
  var ModelSubclass = this[modelName];
  
  Object.extend(ModelSubclass, Model);
  Object.extend(ModelSubclass, {
  	prototype : new Model(ModelSubclass),
  	className : modelName
  });
  
  var modelSchema = WNDatabaseInfo.Schema[modelName];
  var modelAttributes = modelSchema.attributes;
  var modelRelationships = modelSchema.relationships;
    
  // Convert the human-readable attributes to native objects
  for(var attrName in modelAttributes){
    var readableValue = modelAttributes[attrName];
    modelAttributes[attrName] = DBTypes[readableValue];
  }

  // Convert the human-readable relationships to native objects
  for(var relationshipName in modelRelationships){
    var readableValue = modelRelationships[relationshipName];
    var relatedModelName = null;
    var relationshipType = null;
    for(var key in readableValue){
      relatedModelName = key;
      relationshipType = readableValue[key];
      break;
    }
    modelRelationships[relationshipName] = new DBRelationship(ModelSubclass, 
                                                              this[relatedModelName], 
                                                              DBRelationships[relationshipType])
  }
  
  Object.extend(ModelSubclass, modelSchema);

  $allModels.push(ModelSubclass);
  
}

try{

    WNDB.createTables($allModels);
    
}catch(e){

	console.log("Error Creating Database Tables:");
	console.log(e);

}