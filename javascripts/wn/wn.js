// Utility

Array.prototype.remove = function(obj){

	var objIndex = this.indexOf(obj);
	if(objIndex != -1){
		return this.splice(objIndex, 1);
	}
	return null;
	
}

// Finds an element's parent node that matches the selector
Element.addMethods({
	reverseSelect : function(element, selector){
		element = $(element);
		var parentNode = $(element.parentNode);
		try{
			return parentNode.match(selector) ? parentNode : parentNode.reverseSelect(selector);
		}catch(e){
			return null
		}		
	}
});
