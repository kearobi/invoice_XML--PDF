//commercial Invoice function called as a User Event script that is deployed on the item fulfillment record, when set to 'shipped'.
// load Item Fulfillment record
// load corresponding Sales Order

function commercialInvoice_afterSubmit(type)
{
    var record = nlapiLoadRecord('itemfulfillment', nlapiGetRecordId());
    var salesOrder = nlapiLoadRecord('salesorder', record.getFieldValue("createdfrom"));
    // Pass both records into itemFulfillmentPDF
    if(record)
    {
        itemFulfillmentPDF(record, salesOrder);
    }
};

function itemFulfillmentPDF(record, salesOrder)
{

    var htmlFileId = suitecentric.Common.Utils.getScriptParameter('custscript_invoicefileid');
    var htmlFile = nlapiLoadFile(htmlFileId);
    var body = htmlFile.getValue();
    var imgURL = 'https://system.na1.netsuite.com/core/media/media.nl?id=45122&amp;c=TSTDRV1381779&amp;h=2e8b43a44a28a2642aa9';
    // var today = new Date();
    // var timeStamp = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate() + ' ' + today.getHours() + ':' + today.getMinutes() + ':' + today.getSeconds();

    body = body.replace(/@@IMG@@/g, imgURL);
    body = body.replace(/@@INVOICENUMBER@@/g, record.getFieldValue('tranid'));
    body = body.replace(/@@REQUISITION@@/g, "");
    //Custom Field REQUISITION not yet available
    body = body.replace(/@@PAGENUMBER@@/g, record.getFieldValue('pagenumber'));
    //hard coded page number
    body = body.replace(/@@INVOICEDATE@@/g, record.getFieldValue('trandate'));
    body = body.replace(/@@PIECES@@/g, "");
    // body = body.replace(/@@PIECES@@/g, salesOrder.getLineItemValue('item', 'quantity', [i]]));
    body = body.replace(/@@TERMS@@/g, salesOrder.getFieldValue('terms') || "");
    body = body.replace(/@@CARRIER@@/g, salesOrder.getFieldValue('shipcarrier') || "");
    body = body.replace(/@@TRACKINGNUMBERS@@/g, record.getFieldValue('packagetrackingnumber') || "");
    body = body.replace(/@@SHIPFROM@@/g, salesOrder.getFieldValue('location') || "");
    body = body.replace(/@@SHIPTO@@/g, record.getFieldValue('shipaddress') || "");
    body = body.replace(/@@TOTALVALUE@@/g, "$ " + salesOrder.getFieldValue('total') || "");
    body = body.replace(/@@CURRENCY@@/g, record.getFieldValue('currencycode') || "");

    var itemHTML = '';

    for(var lineArray = 1; lineArray <= record.getLineItemCount('item'); lineArray++)
    {
        body = body.replace(/@@TOTALGROSSWEIGHT@@/g, salesOrder.getLineItemValue('item', 'weightinlb', lineArray) || "");
        body = body.replace(/@@TOTALNETWEIGHT@@/g, record.getLineItemValue('package', 'packageweight', lineArray) || "");
        var itemHTMLTemplate =
            "<tr class='category_items'>\
                <td class='align-left'>@@PARTNUMBER@@</td>\
                <td class='align-left'>@@DESCRIPTION@@</td>\
                <td class='align-center'>@@COMMODITYCODE@@</td>\
                <td class='align-center'>@@COUNTRYOFORIGIN@@</td>\
                <td class='align-center'>@@QUANTITY@@</td>\
                <td class='align-right'>@@UNITVALUE@@</td>\
                <td class='align-right'>@@SUBTOTALVALUE@@</td>\
            </tr>";

        var itemHTMLTemplate = JSON.stringify(itemHTMLTemplate);
        itemHTMLTemplate = itemHTMLTemplate.replace(/@@PARTNUMBER@@/g, record.getLineItemText('item', 'item', lineArray) || "");
        itemHTMLTemplate = itemHTMLTemplate.replace(/@@DESCRIPTION@@/g, record.getLineItemValue('item', 'itemdescription', lineArray) || "");
        itemHTMLTemplate = itemHTMLTemplate.replace(/@@COMMODITYCODE@@/g, '8525.80.5050');
        //Custom field commodity code not available yet
        itemHTMLTemplate = itemHTMLTemplate.replace(/@@COUNTRYOFORIGIN@@/g, 'US');
        //is country of Origin = purchaser country or product?
        itemHTMLTemplate = itemHTMLTemplate.replace(/@@QUANTITY@@/g, record.getLineItemValue('item', 'quantity', lineArray) || "");
        itemHTMLTemplate = itemHTMLTemplate.replace(/@@UNITVALUE@@/g, "$ " + salesOrder.getLineItemValue('item','rate', lineArray) || "");
        // itemHTMLTemplate = itemHTMLTemplate.replace(/@@SUBTOTALVALUE@@/g, "");
        itemHTMLTemplate = itemHTMLTemplate.replace(/@@SUBTOTALVALUE@@/g, "$ " + record.getLineItemValue('item', 'quantity', lineArray) * salesOrder.getLineItemValue('item','rate', lineArray) || "");
        itemHTML += itemHTMLTemplate;
    }
    body = body.replace(/@@ITEMROWS@@/g, itemHTML);

    var xml = "<?xml version=\"1.0\"?>\n<!DOCTYPE pdf PUBLIC \"-//big.faceless.org//report\" \"report-1.1.dtd\">\n";
    xml += "<pdf>";
    xml += body;
    xml += "</pdf>";

    var file = nlapiXMLToPDF( xml );
    var targetFolderId = suitecentric.Common.Utils.getScriptParameter('custscript_targetfolderid');
    file.setFolder(targetFolderId);
    file.setName('CommercialInvoice_' + record.getFieldValue('tranid') + ".pdf");
    var id = nlapiSubmitFile(file);
}
