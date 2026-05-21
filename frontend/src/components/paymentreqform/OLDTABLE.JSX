  <tbody>

    {/* ROW 1 */}
    <tr>

      {/* LEFT COLUMN */}
      <td className="border border-black p-2 w-[28%] align-top">

        <div className="grid grid-cols-[40px_8px_1fr] gap-y-1">

          <span className="font-normal">Paid To</span>
          <span>:</span>
          <span className="font-semibold">
            {header.paid_to}
          </span>

        </div>

      </td>

      {/* RIGHT COLUMN */}
      <td className="border border-black p-2 align-top">

        {/* PRF + DATE */}
        <div className="flex justify-between">

          <div className="grid grid-cols-[120px_10px_1fr]">
            <span className="font-normal">PRF NUMBER</span>
            <span>:</span>
            <span className="font-semibold">
              {header.prf_number}
            </span>
          </div>

          <div className="grid grid-cols-[30px_8px_1fr]">
            <span className="font-normal">DATE</span>
            <span>:</span>
            {/* {console.log("Header Date:", header)} */}
            <span className="font-semibold">
                {header.prf_date ? formatDate(header.prf_date) : ""}
            </span>
          </div>

        </div>

        {/* DIVISION */}
        <div className="grid grid-cols-[120px_10px_1fr] mt-1">

          <span className="font-normal">DIVISION</span>
          <span>:</span>

          <span className="font-semibold">
            {header.division}
          </span>

        </div>

        {/* AMOUNT */}
        <div className="grid grid-cols-[120px_10px_1fr] mt-1">

          <span className="font-normal">AMOUNT</span>
          <span>:</span>

          <span className="font-semibold">
            {header.currency} {formatDecimal(header.amount)}
          </span>

        </div>

      </td>

    </tr>

    {/* ROW 2 */}
    <tr>

      <td className="border border-black p-2"></td>

      <td className="border border-black p-2">

        {/* MODE + CURRENCY */}
        <div className="flex justify-between">

          <div className="grid grid-cols-[120px_10px_1fr]">

            <span className="font-normal">MODE</span>
            <span>:</span>

            <span className="font-semibold">
              {header.mode}
            </span>

          </div>

          <div className="grid grid-cols-[60px_8px_1fr]">

            <span className="font-normal">CURRENCY</span>
            <span>:</span>

            <span className="font-semibold">
              {header.currency}
            </span>

          </div>

        </div>

        {/* DESCRIPTION */}
        <div className="grid grid-cols-[120px_10px_1fr] mt-1">

          <span className="font-normal">DESCRIPTION</span>
          <span>:</span>

          <span className="font-semibold">
            {header.description}
          </span>

        </div>

        {/* PAYMENT MODE */}
        <div className="grid grid-cols-[120px_10px_1fr] mt-1">

          <span className="font-normal">PAYMENT MODE</span>
          <span>:</span>

          <span className="font-semibold">
            {header.payment_mode}
          </span>

        </div>

      </td>

    </tr>

  </tbody>