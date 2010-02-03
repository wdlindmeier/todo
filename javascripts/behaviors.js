document.observe('dom:loaded', function(){
   
   // Updates the list display with items in the DB
   Todo.reloadAllItems();
   
   $('add_item').observe('click', function(){
       Todo.showNewForm();
   });
   
   $('edit_list').observe('click', function(){
      alert('edit items'); 
   });
   
});