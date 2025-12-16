function adjustedScore(pStrokes, holePar) {
    let strokes = wmgt.convert.to_number(pStrokes());
    let par = wmgt.convert.to_number(holePar());
    return strokes ? strokes - par : 0; // if there are no strokes count as a zero
                                        // for a better running total calculation
}

function roundTotal() {
  var self = this;

  self.score = ko.observable(0);

  /* strokes per hole */
  self.s1 = ko.observable(0);
  self.s2 = ko.observable(0);
  self.s3 = ko.observable(0);
  self.s4 = ko.observable(0);
  self.s5 = ko.observable(0);
  self.s6 = ko.observable(0);
  self.s7 = ko.observable(0);
  self.s8 = ko.observable(0);
  self.s9 = ko.observable(0);
  self.s10 = ko.observable(0);
  self.s11 = ko.observable(0);
  self.s12 = ko.observable(0);
  self.s13 = ko.observable(0);
  self.s14 = ko.observable(0);
  self.s15 = ko.observable(0);
  self.s16 = ko.observable(0);
  self.s17 = ko.observable(0);
  self.s18 = ko.observable(0);

  /* par per hole */
  self.par1 = ko.observable(0);
  self.par2 = ko.observable(0);
  self.par3 = ko.observable(0);
  self.par4 = ko.observable(0);
  self.par5 = ko.observable(0);
  self.par6 = ko.observable(0);
  self.par7 = ko.observable(0);
  self.par8 = ko.observable(0);
  self.par9 = ko.observable(0);
  self.par10 = ko.observable(0);
  self.par11 = ko.observable(0);
  self.par12 = ko.observable(0);
  self.par13 = ko.observable(0);
  self.par14 = ko.observable(0);
  self.par15 = ko.observable(0);
  self.par16 = ko.observable(0);
  self.par17 = ko.observable(0);
  self.par18 = ko.observable(0);

  var carnivalHoles = [
    { strokes: self.s1, par: self.par1 },
    { strokes: self.s2, par: self.par2 },
    { strokes: self.s3, par: self.par3 },
    { strokes: self.s4, par: self.par4 },
    { strokes: self.s5, par: self.par5 },
    { strokes: self.s6, par: self.par6 },
    { strokes: self.s7, par: self.par7 },
    { strokes: self.s8, par: self.par8 },
    { strokes: self.s9, par: self.par9 },
    { strokes: self.s10, par: self.par10 },
    { strokes: self.s11, par: self.par11 },
    { strokes: self.s12, par: self.par12 },
    { strokes: self.s13, par: self.par13 },
    { strokes: self.s14, par: self.par14 },
    { strokes: self.s15, par: self.par15 },
    { strokes: self.s16, par: self.par16 },
    { strokes: self.s17, par: self.par17 },
    { strokes: self.s18, par: self.par18 }
  ];

  self.par = ko.observable(0);
  self.scoreOverride = ko.observable(0);
  self.overrideOn = ko.computed(function() {
    if (!!self.scoreOverride()) {
        return true;
    }
    else {
        return false;
    }
  }, self);

  self.total = ko.computed(function() {
    if (!!self.scoreOverride()) {
        return wmgt.convert.to_number(self.scoreOverride());
    }
    else
    return ( 
           adjustedScore(self.s1, self.par1) +
           adjustedScore(self.s2, self.par2) +
           adjustedScore(self.s3, self.par3) +
           adjustedScore(self.s4, self.par4) +
           adjustedScore(self.s5, self.par5) +
           adjustedScore(self.s6, self.par6) +
           adjustedScore(self.s7, self.par7) +
           adjustedScore(self.s8, self.par8) +
           adjustedScore(self.s9, self.par9) +
           adjustedScore(self.s10, self.par10) +
           adjustedScore(self.s11, self.par11) +
           adjustedScore(self.s12, self.par12) +
           adjustedScore(self.s13, self.par13) +
           adjustedScore(self.s14, self.par14) +
           adjustedScore(self.s15, self.par15) +
           adjustedScore(self.s16, self.par16) +
           adjustedScore(self.s17, self.par17) +
           adjustedScore(self.s18, self.par18)
           );
  }, self);

  function carnivalSummary(strokesObs, parObs) {
    var strokes = wmgt.convert.to_number(strokesObs());
    var par = wmgt.convert.to_number(parObs());

    if (strokes <= 0 || par <= 0) {
      return { points: 0, label: "" };
    }

    if (strokes === 1) {
      return { points: 5, label: "Hole In One" };
    }

    var diff = par - strokes;

    if (diff === 4) {
      return { points: 4, label: "Condor" };
    }
    if (diff === 3) {
      return { points: 3, label: "Albatross" };
    }
    if (diff === 2) {
      return { points: 2, label: "Eagle" };
    }
    if (diff === 1) {
      return { points: 1, label: "Birdie" };
    }

    return { points: 0, label: "" };
  }

  self.carnivalPoints = ko.computed(function() {
    return carnivalHoles.reduce(function(total, hole) {
      return total + carnivalSummary(hole.strokes, hole.par).points;
    }, 0);
  }, self);

  self.carnivalLog = ko.computed(function() {
    var entries = carnivalHoles.map(function(hole, index) {
      var summary = carnivalSummary(hole.strokes, hole.par);

      if (summary.points <= 0) {
        return null;
      }

      return "Hole " + (index + 1) + ": " + summary.label + " (" + summary.points + " points)";
    }).filter(function(entry) {
      return !!entry;
    });

    return entries.join("\n");
  }, self);

  self.submissionMatches = ko.computed(function() {
    if (!!self.scoreOverride() || self.s18().length == 0 || self.score().length == 0 || $v("P9_ID").length == 0) {
        return false;
    }
    else {
        return wmgt.convert.to_number(self.score()) === wmgt.convert.to_number(self.total());
    }
  }, self);

  self.scoreError = ko.computed(function() {
    if ($v("P9_WHAT_IF") === "Y") {
        return false;
    }
    else
    if (!!self.scoreOverride() || self.s18().length == 0 || self.score().length == 0) {
        return false;
    }
    else {
        return wmgt.convert.to_number(self.score()) != wmgt.convert.to_number(self.total());
    }
  }, self);

}

// view hole preview
function viewH(el) {
  let hLabel, H;
  let elID = el.id;
  hLabel = elID.split("_")[1];
  H = hLabel.split("H")[1];

  if (!H) {
    // we do not have a Hole number, abort
    return;
  }

  $s("P9_H", H);

  apex.region("holePreview").refresh();
  $("#holePreview").popup("open");
}

function qhide(pID) {
  $("[data-id=" + pID + "]").parents("tr").slideUp();
}
