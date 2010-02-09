var Todo = {
    
    isEditing : false,
    
    reloadAllItems  : function(){
        Item.findAll(function(items){
            var sorted = items.partition(function(i){ return !i.getAttribute('completed_at'); });
            
            if(!localStorage['sort_order_incomplete']) localStorage['sort_order_incomplete'] = 1;
            var sortOrderIncomplete = localStorage['sort_order_incomplete'];
            
            if(!localStorage['sort_column_incomplete']) localStorage['sort_column_incomplete'] = 'position';
            var sortColumnIncomplete = localStorage['sort_column_incomplete'];

            if(!localStorage['sort_order_complete']) localStorage['sort_order_complete'] = -1;
            var sortOrderComplete = localStorage['sort_order_complete'];
            
            if(!localStorage['sort_column_complete']) localStorage['sort_column_complete'] = 'completed_at';
            var sortColumnComplete = localStorage['sort_column_complete'];
            
            var tasksByList = {
                'tasks_incomplete' : sorted[0].sort(function(a,b){
                    // Note: This is comparing the tag_id, not the tag.
                    // While it lumps the tags together, it doesnt alphabetise them                            
                    return a.getAttribute(sortColumnIncomplete) > b.getAttribute(sortColumnIncomplete) ? sortOrderIncomplete : sortOrderIncomplete * -1;
                }), 
                'tasks_complete' : sorted[1].sort(function(a,b){
                    return a.getAttribute(sortColumnComplete) > b.getAttribute(sortColumnComplete) ? sortOrderComplete : sortOrderComplete * -1;
                })
            };

			// Move the editing form into it's correct place if it's not there already
			document.body.insertBefore($('edit_item_form'), $('tasks_incomplete'));		
            						
            for(var listName in tasksByList){
                $(listName).innerHTML = '';
                var items = tasksByList[listName];
                for(var i=0;i<items.length;i++){
                    var item = items[i];
                    $(listName).appendChild(Todo.listItemForItem(item));
                }
            }
            
            Todo.updateSortColumns();
            
            observeDraggableElements(function(draggedElement){
                var items = draggedElement.parentNode.select('.draggable');

	            var sortOrder = 1;
				if(localStorage['sort_column_incomplete'] == 'position'){
					sortOrder = localStorage['sort_order_incomplete'] * 1;
				}
				console.log('sortOrder: '+sortOrder);
							
            	for(var i=0;i<items.length;i++){
					// The position should take sort order into account
					var position = (sortOrder == 1) ? i : items.length - i - 1;
            		var itemLi = items[i];
            		var itemID = itemLi.id.replace('item_', '');
            		var item = Item.recordGraph()[itemID];
            		item.setAttribute('position', position);
            		item.save(function(record){ 
            		    //console.log('set position '+record.getAttribute('position')+' for item '+record.getAttribute('id'));
            		});
            	}
            });
            
        });                
    },
    
    updateSortColumns : function(){
	
        $$('.sorting .selected').each(function(el,i){
            el.removeClassName('selected');
        });

        var sortColumnComplete = localStorage['sort_column_complete'];
        $('sort_complete_'+sortColumnComplete).addClassName('selected');
        
        var sortColumnIncomplete = localStorage['sort_column_incomplete'];
        $('sort_incomplete_'+sortColumnIncomplete).addClassName('selected');

        if($('tasks_incomplete').className.indexOf('sortby_') != -1){
            $('tasks_incomplete').className = $('tasks_incomplete').className.replace(/sortby_\S+/, 'sortby_'+sortColumnIncomplete);
        }else{
            $('tasks_incomplete').addClassName('sortby_'+sortColumnIncomplete);
        }
        
        if($('tasks_incomplete').className.indexOf('sortby_') != -1){
            $('tasks_complete').className = $('tasks_incomplete').className.replace(/sortby_\S+/, 'sortby_'+sortColumnComplete);
        }else{
            $('tasks_complete').addClassName('sortby_'+sortColumnComplete);
        }

		$$('#sort_complete_'+sortColumnComplete+' .order')[0].setAttribute('rel', localStorage['sort_order_complete'] == 1 ? 'ASC' : 'DESC');
		$$('#sort_incomplete_'+sortColumnIncomplete+' .order')[0].setAttribute('rel', localStorage['sort_order_incomplete'] == 1 ?  'ASC' : 'DESC');
        
    },
    
    updateSortOrder : function(status, sortColumn){
        if(status == 'incomplete'){
            var sortKey = 'sort_column_incomplete';
            var orderKey = 'sort_order_incomplete';            
        }else{
            var sortKey = 'sort_column_complete';
            var orderKey = 'sort_order_complete';            
        }
        
        // If this is the same column that we're currently sorting on, 
        // just reverse the direction. Else, default to -1.
        localStorage[orderKey] = localStorage[sortKey] == sortColumn ? localStorage[orderKey] * -1 : -1;
        localStorage[sortKey] = sortColumn;
        
        Todo.reloadAllItems();
    },
    
    makeItemEditable : function(itemID){
        if(Todo.isTouchingItem){
            Todo.cancelEditItem(false);
            var li = $('item_'+itemID);
            li.parentNode.insertBefore($('edit_item_form'), li);
            var item = Item.recordGraph()[itemID];
            // set tag
            $('edit_item_tag_id').value = item.getAttribute('tag_id');
            // set description
            $('edit_item_description').value = item.getAttribute('description');
            // set the id
            $('edit_item_id').value = itemID;
			$('edit_item_form').addClassName('visible');
            li.hide();        
        }        
    },
    
    listItemForItem : function(item){
        var itemID = item.getAttribute('id');
        var li = document.createElement('li');
        li.setAttribute('id', 'item_'+itemID);
        li.className = 'draggable';

        var buttonDelete = document.createElement('button');
        buttonDelete.className = 'delete';
        buttonDelete.onclick = function(e){ Todo.confirmDeleteForItem(itemID); return false; }.bind(this);
        buttonDelete.innerHTML = '<span>X</span>';
        li.appendChild(buttonDelete);
        
        var buttonComplete = document.createElement('button');
        buttonComplete.className = 'complete';
        buttonComplete.onclick = function(e){ Todo.markItemAsComplete(itemID); return false; }.bind(this);
        buttonComplete.innerHTML = '<span>&#10004;</span>';
        li.appendChild(buttonComplete);
                   
        // Description
        var spanDescription = document.createElement('span');
        spanDescription.className = 'item_description';
        spanDescription.innerHTML = item.getAttribute('description');
        li.appendChild(spanDescription);
        
        // Enter editing mode when description is held-down
        var touchdownevent = function(e){
			// Only allow item editing when the list is not in "edit" mode
			if(!Todo.isEditing){
	            Todo.isTouchingItem = true;
	            var touchendevent = function(e){
	                Todo.isTouchingItem = false;
	                document.onmouseup = null;
	            }
	            if(Prototype.Browser.MobileSafari) document.ontouchend = touchendevent;
	            else document.onmouseup = touchendevent;
	            setTimeout("Todo.makeItemEditable("+itemID+")", 600);                        				
			}
        }
        if(Prototype.Browser.MobileSafari) spanDescription.ontouchstart = touchdownevent;
        else spanDescription.onmousedown = touchdownevent;                

/*
        // Position
        var position = item.getAttribute('position');
        if(position){
            var spanPosition = document.createElement('span');
            spanPosition.className = 'position detail';
            spanPosition.innerHTML = position;
            li.appendChild(spanPosition);
        }        
*/

        // Tag
        var tagID = item.getAttribute('tag_id');
        var tag = Tag.recordGraph()[tagID];
        if(tag){
            var spanTag = document.createElement('span');
            spanTag.className = 'tag detail';
            spanTag.innerHTML = tag.getAttribute('name');
            li.appendChild(spanTag);
        }
        
        // Created at
        var createdAt = item.getAttribute('created_at');
        if(createdAt){
            var spanCreated = document.createElement('span');
            spanCreated.className = 'created_at detail';
            spanCreated.innerHTML = createdAt.toString();
            li.appendChild(spanCreated);
        }
        
        // Completed at
        var completedAt = item.getAttribute('completed_at');
        if(completedAt){
            var spanCompleted = document.createElement('span');
            spanCompleted.className = 'completed_at detail';
            spanCompleted.innerHTML = completedAt.toString();
            li.appendChild(spanCompleted);     
        }
        
        // Add position dragger
        var spanDragger = document.createElement('span');
        spanDragger.className = 'dragger';
        spanDragger.innerHTML = '&#8801;';
        li.appendChild(spanDragger);

        return li;
    },
    
    confirmDeleteForItem : function(itemID){
        if(confirm("Are you sure you would like to delete this item?")){
            var item = Item.recordGraph()[itemID];
            if(item){                
                // FUNCTIONAL / TRANSACTIONAL 
                item.destroy(function(item){
                    $('item_'+itemID).remove();
                }.bind(this));
            }                
        }
    },
    
    showNewForm : function(){
		if($('edit_item_form').hasClassName('visible')){
	        // Cancel it in-case it's already visible
	        Todo.cancelEditItem(true);
		}else{
			$('edit_item_form').addClassName('transition');
	        // Move the form above the incomplete list
	        $('tasks_incomplete').parentNode.insertBefore($('edit_item_form'), $('tasks_incomplete'));        
			$('edit_item_form').addClassName('visible');
		}
    },
    
    clearEditingForm : function(){
        // clear tag
        $('edit_item_tag_id').value = '';
        // clear description
        $('edit_item_description').value = '';
        // clear the id
        $('edit_item_id').value = '';                
    },
    
    saveEditItem : function(){
        var itemID = $('edit_item_id').value;
        if(itemID){
            var item = Item.recordGraph()[$('edit_item_id').value];
        }else{
			// 
			var position = $('tasks_incomplete').childNodes.length + 1;
            var item = new Item({position : position});
        }
        var tagID = $('edit_item_tag_id').value;
        if(tagID){
            var tag = Tag.recordGraph()[tagID];
            item.tag.set(tag);
        }
        item.setAttribute('description', $('edit_item_description').value);
        // Close out the new form
        Todo.cancelEditItem(false);
        item.save(function(item){
            Todo.reloadAllItems();
        });
    },
    
    cancelEditItem : function(shouldTransition){		
		if(shouldTransition){
			$('edit_item_form').addClassName('transition');
		}else{
			$('edit_item_form').removeClassName('transition');
		}
        var itemID = $('edit_item_id').value;
        Todo.clearEditingForm();
		$('edit_item_form').removeClassName('visible');
		// NOTE: This isn't the most elegant transition
        if(itemID) $('item_'+itemID).show();
    },
    
    markItemAsComplete : function(itemID){
        var item = Item.recordGraph()[itemID];
        // If it's already completed, mark as incomplete
        var completedDate = !!item.getAttribute('completed_at') ? null : new Date();
        item.setAttribute('completed_at', completedDate);
		// Remove the position from a completed item
		item.setAttribute('position', null);
        item.save(function(item){
            Todo.reloadAllItems();
        });
    },
    
    loadAllTags : function(selectedTagId){
        Tag.findAll(function(tags){
            var options = ['<option value="">[ tag ]</option>'];
            for(var t=0;t<tags.length;t++){
                var tag = tags[t];
                options.push('<option value="'+tag.getAttribute('id')+'">'+tag.getAttribute('name')+'</option>')
            } 
            var optionsHTML = options.join('\n');
            $('edit_item_tag_id').innerHTML = optionsHTML;
            $('edit_item_tag_id').value = selectedTagId;
        });
    },
    
    destroyCurrentTag : function(){
        var tagId = $('edit_item_tag_id').value;
        var tag = Tag.recordGraph()[tagId];
        if(tag && confirm("Are you sure you want to remove the tag "+tag.getAttribute('name')+"?")){
            if(tag) tag.destroy(function(){
                Todo.loadAllTags();
                // Reloading the items so the old tag doesnt show up any more.
                // Perhaps this could be more surgical
                Todo.reloadAllItems();                
            });
        }       
    },

    createNewTag : function(){
        var tagname = prompt("Please enter a tag name:");
        if(tagname && !!tagname.strip()){
            var tag = new Tag({name : tagname});
            tag.save(function(t){
               Todo.loadAllTags(t.getAttribute('id')); 
            });
        }       
    },
    
    toggleEditingMode : function(){
        Todo.isEditing = !Todo.isEditing;
        if(Todo.isEditing){
            $('edit_list').innerHTML = 'Done';
            document.body.addClassName('editing');
        }else{
            $('edit_list').innerHTML = 'Edit';
            document.body.removeClassName('editing');
        }
    }
}