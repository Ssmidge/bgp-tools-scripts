// ==UserScript==
// @name         BGP.tools - PeeringDB Integration
// @namespace    https://ewpratten.com
// @version      1.0
// @description  PeeringDB integration for BGP.tools
// @author       Evan Pratten <ewpratten@gmail.com>
// @match        https://bgp.tools/as/*
// @match        https://bgp.tools/prefix/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=bgp.tools
// @require      https://raw.githubusercontent.com/Ssmidge/bgp-tools-scripts/master/scripts/utils.js
// ==/UserScript==

const PEERINGDB_API_KEY = "<your_api_key>";

function patch_as_page() {
    // Add PeeringDB button
    add_top_tab_item(`<img src="https://www.google.com/s2/favicons?sz=64&domain=peeringdb.com" style="width:16px;">`, `https://peeringdb.com/asn/${get_page_id()}`);

    // Handle adding a domain query button
    var asn_info_text = document.getElementById("network-number").innerText;
    if (asn_info_text.includes("Website")) {
        console.log("Attempting to patch domain query button");
        var url = asn_info_text.match(/^Website (?<url>.*)$/m).groups.url;
        var domain = (new URL(url)).hostname;
        document.getElementById("network-number").innerHTML += ` <strong>(<a href="/dns/${domain}">Query</a>)</strong>`;
    }

    // Move the network name to above the image and info
    document.getElementById("network-name").parentElement.parentElement.prepend(document.getElementById("network-name"));
    document.getElementsByClassName("network-header")[0].prepend(document.createElement("br"));
    document.getElementsByClassName("network-header")[0].prepend(document.createElement("hr"));

    // In-fill data from PeeringDB
    fetch(
        `https://www.peeringdb.com/api/net?asn=${get_page_id()}`,
        {
            headers: {
                'Authorization': `Api-Key ${PEERINGDB_API_KEY}`
            }
        }
    ).then(
        resp => resp.json().then(
            data => {
                // Skip if there is no result for this asn
                if (data.data.length == 0) { return; }
                var asn_info = data.data[0];
                console.log(asn_info);

                // Substitute the network name
                var existing_name = document.getElementById("network-name").innerText;
                if (existing_name != asn_info.name) {
                    document.getElementById("network-name").innerText = asn_info.name;
                    document.getElementById("network-name").title = `Community submission: ${existing_name}`;
                    document.getElementById("network-name").style.borderBottom = "3px dashed #e3e3e3";
                    document.getElementById("network-name").style.width = "max-content";
                    document.getElementById("network-name").style.cursor = "help";
                    document.head.getElementsByTagName("title")[0].innerText = `AS${get_page_id()} ${asn_info.name} - bgp.tools`;
                }

                // Add extra info from PDB
                if (asn_info.info_traffic) {
                    document.getElementById("network-number").innerHTML += `<br>Traffic <strong>${asn_info.info_traffic}</strong>`;
                    if (asn_info.info_ratio) {
                        document.getElementById("network-number").innerHTML += ` <strong>(${asn_info.info_ratio})</strong>`;
                    }
                }
                if (asn_info.policy_general) {
                    document.getElementById("network-number").innerHTML += `<br>Peering <strong>${asn_info.policy_general}</strong>`;
                }
                if (asn_info.irr_as_set) {
                      const asSets = asn_info.irr_as_set.split(" "); // Split as-sets by space

                      asSets.forEach(asSet => {
                          document.getElementById("network-number").innerHTML += `<br>AS-Set <strong><a href="https://bgp.tools/as-set/${asSet}">${asSet}</a></strong>`;
                      });
                }

                // Add network link buttons
                if (asn_info.looking_glass) {
                    add_top_tab_item(`<i class="fa-solid fa-magnifying-glass"></i>`, asn_info.looking_glass);
                }
                if (asn_info.route_server) {
                    add_top_tab_item(`<i class="fa-solid fa-server"></i>`, asn_info.route_server);
                }
                if (asn_info.status_dashboard) {
                    add_top_tab_item(`<i class="fa-solid fa-circle-info"></i>`, asn_info.status_dashboard);
                }

                // Add even more data using the org info
                fetch(
                    `https://www.peeringdb.com/api/org/${asn_info.org_id}`,
                    {
                        headers: {
                            'Authorization': `Api-Key ${PEERINGDB_API_KEY}`
                        }
                    }
                ).then(
                    resp => resp.json().then(
                        data => {
                            document.getElementById("network-number").innerHTML += `<br>Operated by <strong><a href="https://www.peeringdb.com/org/${asn_info.org_id}">${data.data[0].name}</a></strong`;
                        }
                    )
                )
            }
        )
    );
}

function patch_prefix_page() {

    // Get the primary ASN announcing this prefix
    var primary_asn = document.getElementById("network-number").getElementsByTagName("strong")[0].getElementsByTagName("a")[0].innerText.match(/^AS(?<asn>\d+)/).groups.asn;

    // Make a peeringdb request for the asn
    fetch(
        `https://www.peeringdb.com/api/net?asn=${primary_asn}`,
        {
            headers: {
                'Authorization': `Api-Key ${PEERINGDB_API_KEY}`
            }
        }
    ).then(
        resp => resp.json().then(
            data => {
                // Skip if there is no result for this asn
                if (data.data.length == 0) { return; }

                // Rewrite the primary ASN to include the name
                document.getElementById("network-number").getElementsByTagName("strong")[0].children[0].outerHTML = `<strong><a href="/as/${primary_asn}">AS${primary_asn}</a> (${data.data[0].name})</strong`;
            }
        )
    );
}

// Entry
(function () {
    'use strict';

    // Inject custom styles
    document.head.innerHTML += `
    <style>
        .section-tabs ul li a {
            padding: 11px 11px 9px 9px;
        }
    </style>`;
    document.head.innerHTML += `
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.2.0/css/all.min.css"
    integrity="sha512-xh6O/CkQoPOWDdYTDqeRdPCVd1SpvCA9XXcUnZS2FmJNp1coAFzvtCN9BmamE+4aHK8yyUHUSCcJHgXloTyT2A=="
    crossorigin="anonymous" referrerpolicy="no-referrer" />
    `;

    // Per-page changes
    switch (get_page_type()) {
        case "as":
            patch_as_page();
            break;
        case "prefix":
            patch_prefix_page();
            break;
    }

})();
