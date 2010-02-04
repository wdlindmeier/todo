document.observe('dom:loaded', function(){
   
    // Updates the dropdown list with all the tags
    Todo.loadAllTags();

    // Updates the list display with items in the DB
    Todo.reloadAllItems();

    // Shows the new item form
    $('add_item').observe('click', function(){
        Todo.showNewForm();
    });

    // Enter/exit edit mode
    $('edit_list').observe('click', function(){
        alert('edit items'); 
    });

    $('cancel_edit_item').observe('click', function(){
        Todo.cancelEditItem();
    });

    $('save_edit_item').observe('click', function(){
        Todo.saveEditItem();
    });

    // Creates a new tag, and selects it
    $('button_add_tag').observe('click', function(){
        Todo.createNewTag();
    });

    // Removes a tag
    $('button_remove_tag').observe('click', function(){
        Todo.destroyCurrentTag();
    });   
    
});