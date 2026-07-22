// utils/printHelper.js

 const now = new Date();

  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();

  let hours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';

  hours = hours % 12;
  hours = hours ? hours : 12;

  const printedDate = now.toLocaleString("en-GB", {
  timeZone: "Asia/Dubai",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
});

export const openPrintWindow = ({
  content,
  userName = "kumar",
  title = "PRINT"
}) => {
  const printWindow = window.open("", "", "width=1200,height=800");

  if (!printWindow) {
    alert("Popup blocked! Please allow popups.");
    return;
  }

  const UserNameFormatted = userName.charAt(0).toUpperCase() + userName.slice(1).toLowerCase();

 

  printWindow.document.write(`
    <html>
      <head>
        <title>${title}</title>

        <style>
          body {
            font-family: "Times New Roman", serif;
            font-size: 8px;
            margin: 0;
            padding: 5px;
          }

          table {
            width: 100%;
            border-collapse: collapse;
          }

           td {
            border: 1px solid #000;
            padding: 5px;
            font-size: 8px;
          }

         th {
            background-color: #c5c5c7 !important;
            color: black !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
             font-size: 7px;
          }

          .center {
            text-align: center;
          }

          .right {
            text-align: right;
          }

          .title {
            text-align: center;
            margin-bottom: 10px;
          }

          @page {
            size: A4 landscape;
            margin: 10mm;
          }

          @media print {
            thead { display: table-header-group; }
          }
        </style>
      </head>

      <body>
        ${content}

        <script>
        (function () {
          const style = document.createElement('style');
          style.textContent = \`
            @media print {
              @page {
                
                @bottom-left {
                  content: "User: ${UserNameFormatted} | Printed: ${printedDate}";
                  font-size: 10px;
                  margin-bottom: 20mm;
                }
                @bottom-right {
                  content: "Page " counter(page) " of " counter(pages);
                  font-size: 10px;
                  margin-bottom: 20mm;
                }
              }
            }\`;
          document.head.appendChild(style);
        })();

        window.onload = function() {
          window.focus();
          window.print();
        }
      </script>
      </body>
    </html>
  `);

  printWindow.document.close();
};

export const previewPrintContent = ({ content, userName = "kumar", title = "PRINT" }) => {
  const previewWindow = window.open("", "", "width=1200,height=800");
  if (!previewWindow) {
    alert("Popup blocked! Please allow popups.");
    return;
  }
  previewWindow.document.write(`
    <html>
     
      <body>
        ${content}
      </body>
       <script>
        (function () {
          const style = document.createElement('style');
          style.textContent = \`
            @media print {
              @page {
                
                @bottom-left {
                  content: "User: ${userName} | Printed: ${printedDate}";
                  font-size: 10px;
                  margin-bottom: 20mm;
                }
                @bottom-right {
                  content: "Page " counter(page) " of " counter(pages);
                  font-size: 10px;
                  margin-bottom: 20mm;
                }
              }
            }\`;
          document.head.appendChild(style);
        })();

        window.onload = function() {
          window.focus();
          window.print();
        }
      </script>
    </html>
  `);
  previewWindow.document.close();
};