$IS_IPHONE = Prototype.Browser.MobileSafari;
$draggedElement = null;
$draggedOffset = {x : 0, y : 0};		
$draggableParentOffset = {x : 0, y : 0};
$draggedPosition = null;
$draggedDimensions = {width : 0, height : 0};

function setDraggedElement(el, event){
	$draggedDimensions = el.getDimensions();
	$draggedElement = el;
	$(el).removeClassName('inactive');
	$(el).addClassName('dragging');
	var xy = el.positionedOffset();
	var pointX = $IS_IPHONE ? event.touches[0].clientX : event.pointerX();
	var pointY = $IS_IPHONE ? event.touches[0].clientY : event.pointerY();
	$draggedOffset.x = pointX - xy[0];
	$draggedOffset.y = pointY - xy[1];
	var xy = el.parentNode.positionedOffset();
	var wh = el.parentNode.getDimensions();
	$draggableParentRect = {x : xy[0], y : xy[1], width : wh.width, height : wh.height};
}

function repositionDraggedElement(clientY){
	// Determine where the node should go
	var next = { element : null, position : null };
	var lis = $draggedElement.parentNode.select('li');
	var nodesBefore = 0;
	
	for(var l=0;l<lis.length;l++){
		var li = lis[l];
		if(li != $draggedElement){
			// this has to be relative to the parent
			var liY = li.positionedOffset()[1] - $draggableParentRect.y;
			var liDimensions = li.getDimensions();
			// Find the element that is closest to the dropped element
			if(liY + (liDimensions.height * 0.5) > clientY){									
				if(!next.position || liY < next.position){
					next.element = li;
					next.position = liY;
				}
			}else{
				nodesBefore++;
			}
		}
	}		
	// out position == nodesBefore
	var container = $draggedElement.parentNode;
	if(nodesBefore != 0){							
		container.insertBefore($draggedElement, next.element);
	}else{
		container.insertBefore($draggedElement, container.firstChild);
	}
	// Send the position to someone
	$draggedPosition = nodesBefore;
}


function observeDraggableElements(callbackHandler){
    // Observe the drag
	$$(".draggable").each(function(draggable,i){
		var dragger = draggable.select('.dragger')[0];
		if(dragger){
    		dragger.ontouchmove = function(e){
    			e.preventDefault();
    		}.bind(this);
			if(!$IS_IPHONE) dragger.onmousemove = dragger.ontouchmove;
			
    		dragger.ontouchstart = function(e){
    			e.preventDefault();
    			setDraggedElement(draggable, e);
    		}.bind(this);
			if(!$IS_IPHONE) dragger.onmousedown = dragger.ontouchstart;

    		dragger.ontouchend = function(e){				
    			//e.preventDefault();
    			callbackHandler(draggable);
    		}.bind(this);	
			if(!$IS_IPHONE) dragger.onmouseup = dragger.ontouchend;
		}
	}.bind(this));	
}

document.observe('dom:loaded', function(){

	document.ontouchstart = function(e){
		
		if($draggedElement){
			e.preventDefault();	
			document.ontouchmove = function(e){
				e.preventDefault();											
				var pointY = $IS_IPHONE ? e.touches[0].clientY : e.pointerY();
				repositionDraggedElement(pointY - $draggableParentRect.y);						
				var y = pointY - $draggableParentRect.y;				
				var cellY = 0;
				for(var c=0;c<$draggedPosition;c++){
					cellY += $draggedElement.parentNode.childNodes[c].getDimensions().height;
				}

				var elY = y - cellY - $draggedOffset.y;
				// This condition prevents the li from going over the edges of the container.
				var marginOverlap = $draggedDimensions.height * 0.5;
				if(y <= $draggableParentRect.height + marginOverlap 
					&& y >= marginOverlap * -1){
					$draggedElement.style.top = elY+'px';
				}
			}
		} 
	}

	document.ontouchend = function(e){
		if($draggedElement){
			//e.preventDefault();
			$($draggedElement).addClassName('inactive');
			$($draggedElement).removeClassName('dragging');
			$draggedElement.style.top = null;
			$draggedElement.style.left = null;						
			$draggedElement = null;
			// Stop observing the move event
			document.ontouchmove = null;
		}					
	}		
	
});

if(!$IS_IPHONE){
	// Create some compatability event handlers 
	document.onmouseup = function(e){
		document.ontouchend(e);
	}
	document.onmousedown = function(e){
		document.ontouchstart(e);
	}
	document.onmousemove = function(e){
		if(document.ontouchmove) document.ontouchmove(e);
	}	
	Event.prototype.preventDefault = function(){};
}
