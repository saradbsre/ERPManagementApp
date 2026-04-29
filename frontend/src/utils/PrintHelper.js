// utils/printHelper.js

export const openPrintWindow = ({ content, userName = "kumar", title = "PRINT" }) => {
  const printWindow = window.open('', '', 'width=900,height=700');

  if (!printWindow) {
    alert("Popup blocked! Please allow popups for this site.");
    return;
  }

  const now = new Date();

  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();

  let hours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';

  hours = hours % 12;
  hours = hours ? hours : 12;

  const printedDate = `${day}/${month}/${year} ${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;

  printWindow.document.write(`
  <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <style>
        body { font-family: 'Times New Roman', Times, serif; padding: 10px; font-size: 8px; margin: 0; }
        table { border-collapse: collapse; width: 100%; margin-bottom: 10px; }
        th, td { border: 1px solid black; padding: 6px; font-size: 9px; }
        th { background-color: #f0f0f0; }
        td.text-right { text-align: right; }
        td.text-left { text-align: left; }
        td.text-right { text-align: right; }
        td.text-left { text-align: left; }
        td.text-center { text-align: center; }
        th { text-align: center; }
        @page {
        size: A4 landscape;
          margin: 10mm;
          counter-increment: page;

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
    </body>
  </html>
  `);

  printWindow.document.close();
};