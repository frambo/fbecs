/*
 * Main function
 */
$(function() {
  // check initial filter value
  
  // setup bootstart select
  $('.selectpicker').selectpicker();
  //$('.selectpicker').selectpicker('val', 'Month');

  $('#filter').change(function(){
  	window.location.href = "/fbevtlist?filter="+$(this).val();
  });
});