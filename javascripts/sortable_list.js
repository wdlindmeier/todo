$draggedElement = null;
$draggedOffset = {x : 0, y : 0};		
$draggableParentOffset = {x : 0, y : 0};
$draggedPosition = null;
$draggedDimensions = {width : 0, height : 0};

function setDraggedElement(el, event){
	$draggedDimensions = el.getDimensions();
	el.style.width = $draggedDimensions.width+'px';
	$draggedElement = el;
	$(el).addClassName('dragging');
	var xy = el.positionedOffset();
	$draggedOffset.x = event.touches[0].clientX - xy[0];
	$draggedOffset.y = event.touches[0].clientY - xy[1];				
	var xy = el.parentNode.positionedOffset();
	var wh = el.parentNode.getDimensions();
	$draggableParentRect = {x : xy[0], y : xy[1], w : wh.width, h : wh.height};
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
    		dragger.ontouchstart = function(e){
    			e.preventDefault();
    			setDraggedElement(draggable, e);
    		}.bind(this);
    		dragger.ontouchend = function(e){				
    			e.preventDefault();
    			callbackHandler(draggable);
    		}.bind(this);	
		}
	}.bind(this));	
}

document.observe('dom:loaded', function(){
    // TODO: Does observing the touchmove event work in iPhone?
    // e.g. document.observe('touchmove', function(e){
	document.ontouchmove = function(e){
		if($draggedElement){
			e.preventDefault();											
			repositionDraggedElement(e.touches[0].clientY - $draggableParentRect.y);						
			var y = e.touches[0].clientY - $draggableParentRect.y;
			var elY = y - ($draggedPosition * $draggedDimensions.height) - $draggedOffset.y;
			// This prevents the li from going over the edges of the container.
			if(elY <= $draggedDimensions.height && elY >= $draggedDimensions.height * -1){
				$draggedElement.style.top = elY+'px';
			}
			repositionDraggedElement(e.touches[0].clientY - $draggableParentRect.y);
		}
	}
	
	document.ontouchend = function(e){
		if($draggedElement){
			e.preventDefault();
			$($draggedElement).removeClassName('dragging');						
			$draggedElement.style.top = null;
			$draggedElement.style.left = null;						
			$draggedElement.style.width = null;
			new Effect.Highlight($draggedElement, { startcolor : '#ffff00', duration : 0.2});
		}					
		$draggedElement = null;
	}					
	
	observeDraggableElements();
	
});