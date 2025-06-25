$(document).ready(function() {
    $(".extra, .padrao, .tecnico, .contrato").hide();

    $("#extra, #padrao, #tecnico, #contrato").on("click", function() {
        var targetID = $(this).attr('id');
        $("." + targetID).toggle("slow");
        $(this).toggleClass("active");
    });
});
